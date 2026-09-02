import { vi } from 'vitest';

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
})));

vi.stubGlobal('requestIdleCallback', undefined);

vi.stubGlobal('cancelIdleCallback', vi.fn());

vi.mock('/Gmail.svg', () => ({ default: 'Gmail.svg' }));
vi.mock('/QQ.svg', () => ({ default: 'QQ.svg' }));
