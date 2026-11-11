import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { SignInForm } from "./SignInForm";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = { title: "Sign in · Lost Cause" };

async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return <SignInForm next={next} />;
}

export default function Page(props: PageProps<"/signin">) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-lg px-5 py-20">
        <div className="pop rounded-[2rem] bg-cream p-8 md:p-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-flare">Sign in</p>
          <h1 className="mt-2 text-5xl font-extrabold leading-[0.95] tracking-[-0.03em]">
            Lost your password?
            <br />
            <span className="text-flare">Good. We don&apos;t use one.</span>
          </h1>
          <Suspense fallback={<div className="mt-8 h-40" />}>
            <SignIn searchParams={props.searchParams as Promise<{ next?: string }>} />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
