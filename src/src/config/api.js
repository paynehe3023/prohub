/**
 * API 统一配置文件
 * 通过环境变量 VITE_API_BASE_URL 控制后端地址
 * 开发环境: Vite proxy 到 localhost:3000
 * 生产环境: 同域下的 /api 路径
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const apiConfig = {
  baseURL: API_BASE_URL,
  socketURL: SOCKET_URL,
  endpoints: {
    parse: '/parse',
    clipboardUpload: '/clipboard/upload',
    clipboardHealth: '/clipboard/health',
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
