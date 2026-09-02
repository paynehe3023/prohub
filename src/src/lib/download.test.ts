import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isMobileDevice } from './download';

describe('isMobileDevice', () => {
  const matchMediaMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('window', { matchMedia: matchMediaMock } as unknown as Window);
    matchMediaMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('window', {} as Window);

    expect(isMobileDevice()).toBe(false);
  });

  it('returns true when pointer is coarse', () => {
    matchMediaMock.mockReturnValue({ matches: true });

    expect(isMobileDevice()).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(pointer: coarse)');
  });

  it('returns false when pointer is not coarse', () => {
    matchMediaMock.mockReturnValue({ matches: false });

    expect(isMobileDevice()).toBe(false);
  });
});