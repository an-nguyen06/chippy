import axios from "axios";

// Production uses Vercel's same-origin proxy so session cookies are first-party.
// Keep this explicit: a stale Vercel VITE_API_URL must not bypass the proxy.
export const api = axios.create({
  baseURL: import.meta.env?.PROD ? "/api" : import.meta.env?.VITE_API_URL || "/api",
  withCredentials: true,
  timeout: 15000,
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || (error.response ? "Something went wrong. Please try again." : "Can't reach Chippy. Check your connection and try again.");
  }
  return "Something went wrong. Please try again.";
}
