function createEmitter() {
  const listenersByEvent = new Map();

  const emitter = {
    on(eventName, handler) {
      if (typeof handler !== 'function') {
        return emitter;
      }

      const listeners = listenersByEvent.get(eventName) || new Set();
      listeners.add(handler);
      listenersByEvent.set(eventName, listeners);
      return emitter;
    },
    once(eventName, handler) {
      if (typeof handler !== 'function') {
        return emitter;
      }

      const wrappedHandler = (...args) => {
        emitter.off(eventName, wrappedHandler);
        handler(...args);
      };
      return emitter.on(eventName, wrappedHandler);
    },
    off(eventName, handler) {
      const listeners = listenersByEvent.get(eventName);
      if (!listeners) {
        return emitter;
      }

      listeners.delete(handler);
      if (listeners.size === 0) {
        listenersByEvent.delete(eventName);
      }
      return emitter;
    },
    emit(eventName, ...args) {
      const listeners = listenersByEvent.get(eventName);
      if (!listeners || listeners.size === 0) {
        return false;
      }

      for (const handler of Array.from(listeners)) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[clipboard-socket] listener error for ${eventName}:`, error);
        }
      }
      return true;
    },
    removeAllListeners() {
      listenersByEvent.clear();
      return emitter;
    },
  };

  return emitter;
}

function normalizeBaseUrl(baseUrl) {
  try {
    return new URL(String(baseUrl || window.location.origin), window.location.origin).origin;
  } catch (error) {
    return window.location.origin;
  }
}

function normalizeRoomId(value) {
  const candidate = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return candidate.length >= 4 ? candidate.slice(0, 24) : '';
}

function normalizeTtlMinutes(value, fallbackMinutes = 15) {
  const ttlMinutes = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(ttlMinutes) && ttlMinutes > 0 && ttlMinutes <= 240) {
    return ttlMinutes;
  }
  return fallbackMinutes;
}

function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function waitForMilliseconds(milliseconds, abortSignal) {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, milliseconds);

    if (abortSignal) {
      const abortHandler = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
      abortSignal.addEventListener('abort', abortHandler, { once: true });
    }
  });
}

function parseSseChunk(chunkText) {
  const lines = chunkText.split(/\r?\n/);
  let eventName = 'message';
  const dataLines = [];

  for (const lineText of lines) {
    if (!lineText || lineText.startsWith(':')) {
      continue;
    }

    const separatorIndex = lineText.indexOf(':');
    const fieldName = separatorIndex === -1 ? lineText : lineText.slice(0, separatorIndex);
    const fieldValue = separatorIndex === -1 ? '' : lineText.slice(separatorIndex + 1).replace(/^ /, '');

    if (fieldName === 'event') {
      eventName = fieldValue || 'message';
    } else if (fieldName === 'data') {
      dataLines.push(fieldValue);
    }
  }

  if (dataLines.length === 0 && eventName === 'message') {
    return null;
  }

  const rawData = dataLines.join('\n');
  let parsedData = rawData;

  if (rawData) {
    try {
      parsedData = JSON.parse(rawData);
    } catch (error) {
      parsedData = rawData;
    }
  } else {
    parsedData = null;
  }

  return { eventName, data: parsedData };
}

async function consumeEventStream(response, onEvent, abortSignal) {
  if (!response.body) {
    throw new Error('实时连接不可用');
  }

  const reader = response.body.getReader();
  const textDecoder = new TextDecoder('utf-8');
  let bufferedText = '';

  try {
    while (true) {
      const readResult = await reader.read();
      if (readResult.done) {
        break;
      }

      bufferedText += textDecoder.decode(readResult.value, { stream: true });
      let boundaryIndex = bufferedText.indexOf('\n\n');

      while (boundaryIndex !== -1) {
        const chunkText = bufferedText.slice(0, boundaryIndex);
        bufferedText = bufferedText.slice(boundaryIndex + 2);
        const parsedEvent = parseSseChunk(chunkText);
        if (parsedEvent) {
          onEvent(parsedEvent);
        }
        boundaryIndex = bufferedText.indexOf('\n\n');
      }

      if (abortSignal?.aborted) {
        break;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch (error) {
      void error;
    }
  }

  const trailingText = bufferedText + textDecoder.decode();
  const trailingEvent = parseSseChunk(trailingText);
  if (trailingEvent) {
    onEvent(trailingEvent);
  }
}

function buildStreamUrl(baseUrl, roomId, clientId, ttlMinutes) {
  const streamUrl = new URL('/api/clipboard/stream', baseUrl);
  streamUrl.searchParams.set('roomId', roomId);
  streamUrl.searchParams.set('clientId', clientId);
  streamUrl.searchParams.set('ttlMinutes', String(ttlMinutes));
  return streamUrl.toString();
}

function buildEventUrl(baseUrl) {
  return new URL('/api/clipboard/event', baseUrl).toString();
}

async function postClipboardEvent(baseUrl, payload, abortSignal) {
  const response = await fetch(buildEventUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: abortSignal,
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(responseData.error || responseData.message || `HTTP ${response.status}`);
  }
  return responseData;
}

export function io(baseUrl, options = {}) {
  const socketListeners = createEmitter();
  const transportListeners = createEmitter();
  const state = {
    baseUrl: normalizeBaseUrl(baseUrl),
    roomId: normalizeRoomId(options.roomId || options.query?.roomId),
    ttlMinutes: normalizeTtlMinutes(options.ttlMinutes, 15),
    clientId: createClientId(),
    connected: false,
    everConnected: false,
    destroyed: false,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectDelay: Math.max(250, Number(options.reconnectionDelay) || 1200),
    reconnectDelayMax: Math.max(500, Number(options.reconnectionDelayMax) || 4000),
    connectAbortController: null,
    streamPromise: null,
    initialConnectErrorEmitted: false,
    reconnectTimerId: 0,
  };

  async function openRoomStream() {
    if (!state.roomId) {
      return;
    }

    state.connectAbortController = new AbortController();
    const streamUrl = buildStreamUrl(state.baseUrl, state.roomId, state.clientId, state.ttlMinutes);
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
      signal: state.connectAbortController.signal,
    });

    if (!response.ok) {
      const responseData = await response.json().catch(() => ({}));
      throw new Error(responseData.error || responseData.message || `HTTP ${response.status}`);
    }

    await consumeEventStream(response, (parsedEvent) => {
      if (parsedEvent.eventName === 'connected') {
        const connectedPayload = parsedEvent.data || {};
        if (connectedPayload?.room?.ttlMinutes) {
          state.ttlMinutes = connectedPayload.room.ttlMinutes;
        }
        state.clientId = connectedPayload?.clientId || state.clientId;

        if (!state.everConnected) {
          state.everConnected = true;
          state.connected = true;
          socketListeners.emit('connect', connectedPayload);
          return;
        }

        state.connected = true;
        state.reconnecting = false;
        socketListeners.emit('connect', connectedPayload);
        transportListeners.emit('reconnect', state.reconnectAttempt || 1);
        state.reconnectAttempt = 0;
        return;
      }

      socketListeners.emit(parsedEvent.eventName, parsedEvent.data);
    }, state.connectAbortController.signal);
  }

  async function connectionLoop() {
    while (!state.destroyed) {
      if (state.roomId) {
        try {
          await openRoomStream();
        } catch (error) {
          if (state.destroyed) {
            break;
          }

          const streamWasEverConnected = state.everConnected;
          state.connected = false;
          state.reconnecting = streamWasEverConnected;

          if (streamWasEverConnected) {
            socketListeners.emit('disconnect');
          } else if (!state.initialConnectErrorEmitted) {
            state.initialConnectErrorEmitted = true;
            socketListeners.emit('connect_error', error);
          }
        }
      }

      if (state.destroyed) {
        break;
      }

      if (state.connected) {
        state.connected = false;
        socketListeners.emit('disconnect');
      }
      state.reconnecting = true;
      if (state.everConnected) {
        state.reconnectAttempt += 1;
        transportListeners.emit('reconnect_attempt', state.reconnectAttempt);
      }

      const nextDelay = Math.min(state.reconnectDelay * Math.max(1, state.reconnectAttempt || 1), state.reconnectDelayMax);
      await waitForMilliseconds(nextDelay, state.connectAbortController?.signal);
    }
  }

  state.streamPromise = connectionLoop().catch((error) => {
    if (!state.destroyed) {
      console.error('[clipboard-socket] connection loop crashed:', error);
    }
  });

  const socket = {
    io: transportListeners,
    on: socketListeners.on,
    once: socketListeners.once,
    off: socketListeners.off,
    emit(eventName, payload = {}, ack) {
      const requestPayload = {
        roomId: normalizeRoomId(payload.roomId || state.roomId),
        clientId: payload.clientId || state.clientId,
        event: eventName,
        payload,
      };

      const requestPromise = postClipboardEvent(state.baseUrl, requestPayload)
        .then((responseData) => {
          if (typeof ack === 'function') {
            ack(responseData);
          }
          return responseData;
        })
        .catch((error) => {
          const fallbackResponse = { ok: false, error: error.message || '请求失败' };
          if (typeof ack === 'function') {
            ack(fallbackResponse);
          }
          return fallbackResponse;
        });

      return requestPromise;
    },
    disconnect() {
      state.destroyed = true;
      state.connected = false;
      state.reconnecting = false;
      if (state.connectAbortController) {
        state.connectAbortController.abort();
      }
      window.clearTimeout(state.reconnectTimerId);
      socketListeners.emit('disconnect');
      socketListeners.removeAllListeners();
      transportListeners.removeAllListeners();
    },
    removeAllListeners() {
      socketListeners.removeAllListeners();
      transportListeners.removeAllListeners();
      return socket;
    },
    get connected() {
      return state.connected;
    },
    get id() {
      return state.clientId;
    },
  };

  return socket;
}

export default { io };

