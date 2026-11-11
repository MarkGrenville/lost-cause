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
    <div className="case p-8 text-center md:p-12" data-testid="out-of-credits">
      <p className="label text-flare">No credits left</p>
      <h2 className="mt-4 text-4xl uppercase md:text-5xl">Buy credits to open a case.</h2>
      <p className="mx-auto mt-3 max-w-md text-lg text-ink/75">R10 a find. If a search doesn&apos;t help, the credit comes back.</p>
      <Link
        href="/#pricing"
        className="label mt-8 inline-block rounded-[3px] bg-flare px-8 py-4 text-sm font-semibold text-white transition hover:brightness-110"
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
        <p className="label text-flare">New case</p>
        <h1 className="mb-10 mt-2 text-5xl uppercase leading-[0.95] md:text-6xl">
          Where did you see it last?
        </h1>
        <Suspense fallback={<div className="h-96" />}>
          <Find />
        </Suspense>
      </section>
    </SiteShell>
  );
}
