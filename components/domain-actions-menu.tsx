"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const actions = [
  { label: "DNS zone", detail: "Records and nameservers", icon: "dns" },
  { label: "Edit contact details", detail: "Registrant information", icon: "contact" },
  { label: "Grant access", detail: "Share domain management", icon: "access" },
  { label: "Add to folder", detail: "Organize your domains", icon: "folder" },
] as const;

function ToolIcon({ name }: { name: (typeof actions)[number]["icon"] }) {
  const paths = {
    dns: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" /></>,
    contact: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
    access: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 8h5M18.5 5.5v5" /></>,
    folder: <><path d="M3 6.5h7l2 2H21v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11Z" /><path d="M3 9h18" /></>,
  };

  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

export default function DomainActionsMenu({ domain }: { domain: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 280;
      const menuHeight = 340;
      const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
      const below = rect.bottom + 8;
      const top = below + menuHeight <= window.innerHeight ? below : Math.max(12, rect.top - menuHeight - 8);
      setPosition({ top, left });
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    updatePosition();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`More options for ${domain}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More domain options"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            const menuWidth = 280;
            const menuHeight = 340;
            const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
            const below = rect.bottom + 8;
            const top = below + menuHeight <= window.innerHeight ? below : Math.max(12, rect.top - menuHeight - 8);
            setPosition({ top, left });
          }
          setOpen(true);
        }}
        className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 ${open ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-navy-950"}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Domain tools for ${domain}`}
          style={{ top: position.top, left: position.left, width: 280 }}
          className="fixed z-[100] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-navy-950 shadow-[0_24px_70px_-28px_rgba(16,28,58,0.45)]"
        >
          <div className="flex items-start justify-between gap-3 rounded-xl bg-brand-50 px-3 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">Domain tools</p>
              <p className="mt-1 truncate text-xs font-medium text-navy-950">{domain}</p>
            </div>
            <button type="button" aria-label="Close domain tools" onClick={() => setOpen(false)} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-navy-950">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {actions.map((action) => (
              <button key={action.label} type="button" role="menuitem" disabled title={`${action.label} will be available when domain management tools are connected`} className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-100">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100"><ToolIcon name={action.icon} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-navy-950">{action.label}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{action.detail}</span>
                </span>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-100">Soon</span>
              </button>
            ))}
          </div>
          <p className="border-t border-slate-100 px-3 pb-1 pt-2.5 text-[10px] leading-4 text-slate-500">These controls will activate when the registrar connection supports them.</p>
        </div>,
        document.body,
      )}
    </>
  );
}
