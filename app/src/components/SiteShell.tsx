import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { LegalLinks } from "./Legal";

/** The find marker: a thin ring with four ticks. Version 2's logo and result marker. */
export function Crosshair({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 1v5M12 18v5M1 12h5M18 12h5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

async function NavAccount() {
  const user = await currentUser();
  return user ? (
    <Link
      href="/account"
      className="label rounded-[3px] border border-flare/60 px-4 py-2 text-flare transition hover:bg-flare hover:text-white"
    >
      {user.credits} credit{user.credits === 1 ? "" : "s"} · Account
    </Link>
  ) : (
    <Link
      href="/signin"
      className="label rounded-[3px] border border-flare/60 px-4 py-2 text-flare transition hover:bg-flare hover:text-white"
    >
      Sign in
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-cream/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Crosshair className="h-6 w-6 text-signal" />
          <span className="font-head text-2xl uppercase">Lost Cause</span>
        </Link>
        <div className="label hidden items-center gap-8 md:flex">
          <Link href="/#how" className="hover:text-flare">How it works</Link>
          <Link href="/#pricing" className="hover:text-flare">Pricing</Link>
          <Link href="/#faq" className="hover:text-flare">FAQ</Link>
        </div>
        <Suspense fallback={<span className="h-9 w-24 rounded-full bg-ink/5" />}>
          <NavAccount />
        </Suspense>
      </nav>
    </header>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
      <footer className="border-t border-ink/15 bg-cream/90">
        <div className="label mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-ink/70">
          <span>Lost Cause by Web Footprint</span>
          <LegalLinks />
        </div>
      </footer>
    </>
  );
}
