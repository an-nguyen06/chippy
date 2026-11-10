import axios from "axios";

// Development uses Vite's proxy; production points to the deployed backend.
export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || "/api",
  withCredentials: true,
  timeout: 15000,
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || (error.response ? "Something went wrong. Please try again." : "Can't reach Chippy. Check your connection and try again.");
  }
  return "Something went wrong. Please try again.";
}
