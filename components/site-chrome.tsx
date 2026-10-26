"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/navbar";

const focusedPages = new Set(["/login", "/get-started", "/webnexa"]);

export default function SiteChrome({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const focused = focusedPages.has(pathname) || pathname === "/account" || pathname.startsWith("/account/");

  return (
    <>
      {!focused && <Navbar />}
      {focused ? children : <main className="flex-1">{children}</main>}
      {!focused && footer}
    </>
  );
}
