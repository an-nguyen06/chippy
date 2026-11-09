import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { desktopShortcuts } from "@/lib/desktop-shortcuts";
import "@/pages/signup.css";

export function AuthDesktop({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <main className="signup-page">
      <header className="desktop-heading">
        <span className="chippy-wordmark"><Sparkles size={22} aria-hidden="true" /> chippy</span>
      </header>
      <div className="signup-desktop">
        <div className="signup-window-area">
          {children}
        </div>
        <nav className="desktop-shortcuts" aria-label="Explore Chippy">
          {desktopShortcuts.map(({ Icon, label, slug, tone }) => (
            <Link to={`/coming-soon/${slug}`} state={{ from: location.state?.from || location.pathname }} className={`desktop-shortcut shortcut-${tone}`} key={slug} aria-current={location.pathname === `/coming-soon/${slug}` ? "page" : undefined}>
              <span className="shortcut-picture"><Icon aria-hidden="true" strokeWidth={1.6} /></span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

