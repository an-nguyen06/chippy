import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";

export function useSocket() {
  const userId = useAuthStore((state) => state.user?._id);
  const accessToken = useAuthStore((state) => state.accessToken);
  useEffect(() => {
    if (!userId || !accessToken) {socket.disconnect(); return;}
    let active = true;
    let refreshing = false;
    async function renew() {
      if (refreshing) return;
      refreshing = true;
      try {
        const restored = await useAuthStore.getState().refreshAccessToken();
        if (active && restored && useAuthStore.getState().user?._id === userId) socket.connect();
      } finally {refreshing = false;}
    }
    const onError = (error: Error & {data?: {code?: string}}) => {
      if (error.data?.code === "TOKEN_EXPIRED") void renew();
    };
    socket.on("connect_error", onError);
    socket.on("auth:expired", renew);
    socket.connect();
    return () => {
      active = false;
      socket.off("connect_error", onError);
      socket.off("auth:expired", renew);
      socket.disconnect();
    };
  }, [userId, accessToken]);
}
