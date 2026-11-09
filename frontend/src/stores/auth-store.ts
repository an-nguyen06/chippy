import { create } from "zustand";
import { api, getApiError } from "@/lib/api";

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}
interface SignupInput {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}
interface SigninInput { username: string; password: string }
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  signUp: (values: SignupInput) => Promise<boolean>;
  signIn: (values: SigninInput) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  clearError: () => void;
}

// Only session data is shared. Passwords and field validation stay in the forms.
// Tokens live in memory; reloading currently requires signing in again.
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
  signUp: async (values) => {
    if (get().isLoading) return false;
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/signup", values);
      return true;
    } catch (error) {
      set({ error: getApiError(error) });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  signIn: async (values) => {
    if (get().isLoading) return false;
    set({ isLoading: true, error: null, user: null, accessToken: null });
    try {
      const { data } = await api.post<{ accessToken: string }>("/auth/signin", values);
      const profile = await api.get<{ user: AuthUser }>("/users/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      set({ user: profile.data.user, accessToken: data.accessToken });
      return true;
    } catch (error) {
      set({ error: getApiError(error), user: null, accessToken: null });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    if (get().isLoading) return false;
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/signout");
      set({ user: null, accessToken: null });
      return true;
    } catch (error) {
      set({ error: getApiError(error) });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Future protected requests automatically include the current access token.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    useAuthStore.setState({ user: null, accessToken: null });
  }
  return Promise.reject(error);
});
