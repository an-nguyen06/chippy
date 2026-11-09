import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { getAuthDestination } from "@/lib/auth-redirect";

export function GuestRoute() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  return user && accessToken
    ? <Navigate to={getAuthDestination(location.state?.from)} replace />
    : <Outlet />;
}
