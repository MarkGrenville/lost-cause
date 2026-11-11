import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { SiteShell } from "@/components/SiteShell";
import { FindForm } from "./FindForm";

export const metadata: Metadata = { title: "Find it · Lost Cause" };

function OutOfCredits() {
  return (
    <div className="pop rounded-[2rem] bg-sun p-8 text-center md:p-12" data-testid="out-of-credits">
      <p className="text-6xl" aria-hidden>
        🧦
      </p>
      <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">You&apos;re out of lost causes.</h2>
      <p className="mx-auto mt-3 max-w-md text-lg font-medium text-ink/75">
        Zero credits left. The good news: whatever you lost will still be lost when you get back.
      </p>
      <Link
        href="/#pricing"
        className="pop mt-8 inline-block rounded-2xl bg-flare px-8 py-4 text-xl font-extrabold text-white transition hover:-translate-y-0.5"
      >
        Buy credits →
      </Link>
    </div>
  );
}

async function Find() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/find");
  return user.credits < 1 ? <OutOfCredits /> : <FindForm credits={user.credits} />;
}

export default function Page() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-5 py-14">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-flare">New search</p>
        <h1 className="mb-10 mt-2 text-5xl font-extrabold leading-[0.95] tracking-[-0.03em] md:text-6xl">
          Where did you see it last?
        </h1>
        <Suspense fallback={<div className="h-96" />}>
          <Find />
        </Suspense>
      </section>
    </SiteShell>
  );
}
