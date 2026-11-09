import { Folder, Image, Mail, StickyNote, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import "@/pages/signup.css";

const shortcuts = [
  { Icon: Folder, label: "little things", tone: "yellow" },
  { Icon: Image, label: "memories", tone: "blue" },
  { Icon: StickyNote, label: "daydreams", tone: "purple" },
  { Icon: Mail, label: "love letters", tone: "pink" },
];

export function AuthDesktop({ children }: { children: ReactNode }) {
  return (
    <main className="signup-page">
      <header className="desktop-heading">
        <span className="chippy-wordmark"><Sparkles size={22} aria-hidden="true" /> chippy</span>
      </header>
      <div className="signup-desktop">
        <div className="signup-window-area">
          {children}
          <p className="desktop-footnote">made for your everyday hellos. (｡•ᴗ•｡)</p>
        </div>
        <aside className="desktop-shortcuts" aria-label="Desktop decorations">
          {shortcuts.map(({ Icon, label, tone }) => (
            <div className={`desktop-shortcut shortcut-${tone}`} key={label}>
              <span className="shortcut-picture"><Icon aria-hidden="true" strokeWidth={1.6} /></span>
              <span>{label}</span>
            </div>
          ))}
        </aside>
      </div>
      <footer className="desktop-taskbar"><span><span className="desktop-status" /> welcome to your little corner of the internet</span><span aria-hidden="true">✧ chippy.exe</span></footer>
    </main>
  );
}

