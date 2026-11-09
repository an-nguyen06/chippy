import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import ChatAppPage from "./pages/ChatAppPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import { ProtectedRoute } from "./components/protected-route";
import { GuestRoute } from "./components/guest-route";
import { useEffect } from "react";
import { useAuthStore } from "./stores/auth-store";
import { useSocket } from "./hooks/useSocket";

function App() {
  useSocket();
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  useEffect(() => { void initialize(); }, [initialize]);

  if (!isInitialized) return <main className="signup-page"><p role="status">Opening your little corner…</p></main>;
  return (
    <>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/coming-soon/:section" element={<ComingSoonPage />} />
          <Route element={<GuestRoute />}>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ChatAppPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
