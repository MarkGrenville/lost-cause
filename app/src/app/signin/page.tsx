import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { SignInForm } from "./SignInForm";
import { SiteShell } from "@/components/SiteShell";
import { authEmulatorUrl, webConfig } from "@/lib/webConfig";

export const metadata: Metadata = { title: "Sign in · Lost Cause" };

async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return <SignInForm next={next} config={webConfig()} emulator={authEmulatorUrl()} />;
}

export default function Page(props: PageProps<"/signin">) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-lg px-5 py-20">
        <div className="case p-8 md:p-10">
          <p className="label text-flare">Sign in</p>
          <h1 className="mt-2 text-5xl uppercase leading-[0.95]">Sign in to open a case</h1>
          <p className="mt-3 text-ink/70">Use your Google account. There&apos;s no password to keep.</p>
          <Suspense fallback={<div className="mt-8 h-40" />}>
            <SignIn searchParams={props.searchParams as Promise<{ next?: string }>} />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
