import { create } from "zustand";
import { api, getApiError } from "@/lib/api";
import type { InternalAxiosRequestConfig } from "axios";
type SessionRequest = InternalAxiosRequestConfig & {_sessionVersion?: number; _retry?: boolean};

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  preferences?: {compactMode?: boolean; reduceMotion?: boolean};
  privacy?: {allowFriendRequests?: boolean};
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
  isInitialized: boolean;
  initialize: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  isFetchingUser: boolean;
  error: string | null;
  signUp: (values: SignupInput) => Promise<boolean>;
  signIn: (values: SigninInput) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  fetchUser: () => Promise<boolean>;
  clearError: () => void;
}

// Only session data is shared. Passwords and field validation stay in the forms.
// Access tokens stay in memory; the HttpOnly cookie restores the session on reload.
let refreshPromise: Promise<boolean> | null = null;
let refreshVersion = -1;
let initializePromise: Promise<void> | null = null;
let sessionVersion = 0;
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,
  isFetchingUser: false,
  error: null,
  clearError: () => set({ error: null }),
  refreshAccessToken: () => {
    if (refreshPromise && refreshVersion === sessionVersion) return refreshPromise;
    const version = sessionVersion;
    refreshVersion = version;
    refreshPromise = (async () => {
      try {
        const { data } = await api.post<{ accessToken: string; userId?: string }>("/auth/refresh");
        if (version !== sessionVersion) return false;
        if (get().user && data.userId && get().user?._id !== data.userId) {
          sessionVersion++;
          set({user: null, accessToken: null, error: "The account changed in another window. Please sign in again."});
          return false;
        }
        if (!data.accessToken) throw new Error("Missing access token");
        set({ accessToken: data.accessToken });
        return true;
      } catch (error) {
        if (version === sessionVersion) set({ user: null, accessToken: null, error: getApiError(error) });
        return false;
      } finally {
        if (refreshVersion === version) refreshPromise = null;
      }
    })();
    return refreshPromise;
  },
  initialize: () => {
    if (get().isInitialized) return Promise.resolve();
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      try {
        if (await get().refreshAccessToken()) await get().fetchUser();
      } finally {
        set({ isInitialized: true });
        initializePromise = null;
      }
    })();
    return initializePromise;
  },
  fetchUser: async () => {
    const token = get().accessToken;
    const version = sessionVersion;
    if (!token || get().isFetchingUser) return false;
    set({ isFetchingUser: true, error: null });
    try {
      // The request interceptor reads the latest token from this store.
      const { data } = await api.get<{ user: AuthUser }>("/users/me");
      // Ignore a profile response if the session changed while it was loading.
      if (version !== sessionVersion || !get().accessToken) return false;
      set({ user: data.user });
      return true;
    } catch (error) {
      if (get().accessToken === token || !get().accessToken) {
        set({ error: getApiError(error) });
      }
      return false;
    } finally {
      if (version === sessionVersion) set({ isFetchingUser: false });
    }
  },
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
    sessionVersion++;
    set({ isLoading: true, isFetchingUser: false, error: null, user: null, accessToken: null });
    try {
      const { data } = await api.post<{ accessToken: string }>("/auth/signin", values);
      set({ accessToken: data.accessToken });
      if (!await get().fetchUser()) {
        set({ user: null, accessToken: null });
        return false;
      }
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
      sessionVersion++;
      await api.post("/auth/signout");
      set({ user: null, accessToken: null, isFetchingUser: false });
      return true;
    } catch (error) {
      set({ error: getApiError(error) });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Read state at request time so requests always use the current access token.
api.interceptors.request.use((config) => {
  const request = config as SessionRequest;
  if (request._sessionVersion !== undefined && request._sessionVersion !== sessionVersion) {
    throw new Error("This request belongs to a previous session");
  }
  request._sessionVersion = sessionVersion;
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// Auth endpoints never retry themselves. Concurrent failures share one refresh.
api.interceptors.response.use((response) => {
  if ((response.config as SessionRequest)._sessionVersion !== sessionVersion) throw new Error("The session changed while this request was loading");
  return response;
}, async (error) => {
  const request = error.config as SessionRequest | undefined;
  if (request?._sessionVersion !== undefined && request._sessionVersion !== sessionVersion) return Promise.reject(error);
  const status = error.response?.status;
  const authenticationError = status === 401 || (status === 403 && error.response?.data?.message === "expired/incorrent access token");
  if (!request || request.url?.startsWith("/auth/") || !authenticationError) {
    return Promise.reject(error);
  }
  if (request._retry) {
    useAuthStore.setState({ user: null, accessToken: null });
    return Promise.reject(error);
  }
  request._retry = true;
  const currentToken = useAuthStore.getState().accessToken;
  // Another request may already have refreshed the token before this failed.
  if (currentToken && request.headers.Authorization !== `Bearer ${currentToken}`) {
    return api.request(request);
  }
  if (await useAuthStore.getState().refreshAccessToken()) return api.request(request);
  return Promise.reject(error);
});
