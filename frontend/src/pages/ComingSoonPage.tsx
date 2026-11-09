import { Link, Navigate, useLocation, useParams } from "react-router";
import { AuthDesktop } from "@/components/auth-desktop";
import { desktopShortcuts } from "@/lib/desktop-shortcuts";

export default function ComingSoonPage() {
  const { section } = useParams();
  const location = useLocation();
  const shortcut = desktopShortcuts.find(({ slug }) => slug === section);
  if (!shortcut) return <Navigate to="/" replace />;

  const { Icon, label, tone } = shortcut;
  const backTo = location.state?.from === "/signup" ? "/signup" : "/signin";

  return <AuthDesktop>
    <section className="signup-container" aria-labelledby="coming-soon-title">
      <div className="signup-titlebar">
        <span className="window-filename">✧ chippy / {label}</span>
        <span className="window-controls" aria-hidden="true"><span>−</span><span>□</span><span>×</span></span>
      </div>
      <div className={`coming-soon-body shortcut-${tone}`}>
        <span className="shortcut-picture"><Icon aria-hidden="true" strokeWidth={1.6} /></span>
        <span className="signup-kaomoji" aria-hidden="true">(｡•ᴗ•｡)</span>
        <h1 id="coming-soon-title">To be continued…</h1>
        <p>A little something is on its way.</p>
        <Link to={backTo} className="coming-soon-back">← Back to Chippy</Link>
      </div>
      <div className="signup-window-status"><span>♡ {label}, coming soon</span><span aria-hidden="true">✦</span></div>
    </section>
  </AuthDesktop>;
}
