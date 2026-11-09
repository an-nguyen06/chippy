
import { AuthDesktop } from "@/components/auth-desktop";
import { useAuthStore } from "@/stores/auth-store";

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  if (!user) return null;

  return (
    <AuthDesktop>
      <section className="signup-container" aria-labelledby="account-title">
        <div className="signup-titlebar"><span className="window-filename">✧ chippy / your little corner</span></div>
        <div className="signup-window-body">
          <div className="signup-intro">
            <span className="signup-kaomoji" aria-hidden="true">(｡•ᴗ•｡)ﾉ♡</span>
            <h1 id="account-title">You're home</h1>
            <p>Welcome, {user.displayName}!</p>
          </div>
          <div className="signup-form">
            <p>Signed in as @{user.username}</p>
            <p>Your account is connected. Messaging is coming next.</p>
            <button className="signup-submit" disabled={isLoading} onClick={() => void signOut()}>{isLoading ? "Signing out…" : "Sign out"}</button>
            <p className="signup-message" role="status">{error}</p>
          </div>
        </div>
      </section>
    </AuthDesktop>
  );
}

