/**
 * API 统一配置文件
 * 通过环境变量控制前后端地址：
 * - VITE_API_BASE_URL：HTTP API 基础路径
 * - VITE_SOCKET_URL：实时连接地址
 * - VITE_PUBLIC_APP_ORIGIN：房间二维码/分享链接的外部访问地址
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const CURRENT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';
const CURRENT_PROTOCOL = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const CURRENT_HOSTNAME = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const SOCKET_PORT = import.meta.env.VITE_SOCKET_PORT || '3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? CURRENT_PROTOCOL + '//' + CURRENT_HOSTNAME + ':' + SOCKET_PORT : CURRENT_ORIGIN);
const PUBLIC_APP_ORIGIN = import.meta.env.VITE_PUBLIC_APP_ORIGIN || CURRENT_ORIGIN;

export const apiConfig = {
  baseURL: API_BASE_URL,
  socketURL: SOCKET_URL,
  publicOrigin: PUBLIC_APP_ORIGIN,
  endpoints: {
    parse: '/parse',
    clipboardUpload: '/clipboard/upload',
    clipboardHealth: '/clipboard/health',
    clipboardRoomSession: '/clipboard/room/session',
  },
};

/**
 * 封装 fetch 请求
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}
