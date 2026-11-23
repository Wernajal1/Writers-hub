export function apiUrl(path) {
  const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

export async function api(path, options = {}) {
  const { unauthenticated = false, ...requestOptions } = options;
  const token = unauthenticated ? null : localStorage.getItem("writersHubToken")
    || localStorage.getItem("writersHubPaymentToken");
  const headers = new Headers(requestOptions.headers || {});
  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(apiUrl(path), { ...requestOptions, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed. Please try again.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function signOut() {
  localStorage.removeItem("writersHubToken");
  localStorage.removeItem("writersHubPaymentToken");
  localStorage.removeItem("writersHubUser");
}
