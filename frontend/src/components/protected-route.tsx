import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  if (!user || !accessToken) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  return <Outlet />;
}
