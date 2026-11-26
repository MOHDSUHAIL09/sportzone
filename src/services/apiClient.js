import { dispatchLocalApi } from './demoLocalApi';

// In-memory token helper retained for interface compatibility (demo runs 100% client-side)
let memoryAccessToken = null;

export function setMemoryToken(token) {
  memoryAccessToken = token || null;
}

export function getMemoryToken() {
  return memoryAccessToken;
}

export function clearMemoryToken() {
  memoryAccessToken = null;
}

async function callLocal(method, url, data = {}, config = {}) {
  const result = await dispatchLocalApi(method, url, data, config?.params || {});
  return { data: result, status: 200 };
}

const apiClient = {
  get: (url, config = {}) => callLocal('GET', url, {}, config),
  post: (url, data = {}, config = {}) => callLocal('POST', url, data, config),
  put: (url, data = {}, config = {}) => callLocal('PUT', url, data, config),
  patch: (url, data = {}, config = {}) => callLocal('PATCH', url, data, config),
  delete: (url, config = {}) => callLocal('DELETE', url, {}, config),
};

export function getApiErrorMessage(err, fallback = 'Request failed. Please try again.') {
  if (err?.response?.data?.error) return String(err.response.data.error);
  if (err?.message) return String(err.message);
  return fallback;
}

export function generateIdempotencyKey(prefix = 'op') {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export default apiClient;
