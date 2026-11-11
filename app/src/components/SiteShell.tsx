import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { LegalLinks } from "./Legal";

async function NavAccount() {
  const user = await currentUser();
  return user ? (
    <Link
      href="/account"
      className="pop-sm rounded-full bg-sun px-4 py-1.5 text-sm font-bold transition hover:-translate-y-0.5"
    >
      {user.credits} credit{user.credits === 1 ? "" : "s"} · Account
    </Link>
  ) : (
    <Link
      href="/signin"
      className="pop-sm rounded-full bg-sun px-4 py-1.5 text-sm font-bold transition hover:-translate-y-0.5"
    >
      Sign in
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-cream/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="relative inline-flex h-7 w-7 items-center justify-center">
            <span className="ring absolute inset-0" />
            <span className="h-2 w-2 rounded-full bg-flare" />
          </span>
          Lost Cause
        </Link>
        <div className="hidden items-center gap-7 text-sm font-semibold md:flex">
          <Link href="/#how" className="hover:text-flare">How it works</Link>
          <Link href="/#mom" className="hover:text-flare">vs Mom</Link>
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
      <footer className="border-t-[3px] border-ink bg-flare">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-sm font-semibold">
          <span>Lost Cause by Web Footprint</span>
          <LegalLinks />
        </div>
      </footer>
    </>
  );
}
