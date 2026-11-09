import axios from "axios";

// Vite forwards /api to Express during local development.
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15000,
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || (error.response ? "Something went wrong. Please try again." : "Can't reach Chippy. Check your connection and try again.");
  }
  return "Something went wrong. Please try again.";
}
