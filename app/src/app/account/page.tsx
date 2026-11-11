import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { signOut } from "../signin/actions";
import { SiteShell } from "@/components/SiteShell";
import { ordersFor } from "@/lib/orders";
import { findPack, rands } from "@/lib/packs";

export const metadata: Metadata = { title: "Your account · Lost Cause" };

type Flash = { paid?: string; pending?: string; cancelled?: string };

async function Account({ searchParams }: { searchParams: Promise<Flash> }) {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/account");
  const flash = await searchParams;
  const orders = ordersFor(user.id);
  const justPaid = flash.paid ? orders.find((o) => o.id === flash.paid && o.status === "paid") : undefined;

  return (
    <>
      {justPaid && (
        <div className="pop mb-10 rounded-3xl bg-mint p-6" data-testid="credits-landed">
          <p className="text-3xl font-extrabold tracking-tight">
            +{justPaid.credits} credits landed. Go find that sock.
          </p>
          <p className="mt-1 font-semibold">
            Order {justPaid.id} · R{rands(justPaid.amount_cents)} paid on the PayFast sandbox
          </p>
          {justPaid.confirmed_via === "dev_return" && (
            <p className="mt-3 inline-block rounded-lg border-2 border-dashed border-ink bg-white/70 px-3 py-1.5 font-mono text-xs font-bold">
              DEV ONLY: confirmed by the return URL because PayFast&apos;s ITN can&apos;t reach localhost
            </p>
          )}
        </div>
      )}
      {flash.cancelled && (
        <div className="pop-sm mb-10 rounded-2xl bg-white p-5 font-bold">Payment cancelled. No credits, no charge, no lecture.</div>
      )}
      {flash.pending && (
        <div className="pop-sm mb-10 rounded-2xl bg-white p-5 font-bold">
          Waiting for PayFast to confirm order {flash.pending}. Credits appear as soon as it does.
        </div>
      )}
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-flare">Your account</p>
      <h1 className="mt-2 break-words text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">{user.email}</h1>

      <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="pop rounded-3xl bg-sun p-8">
          <p className="font-mono text-xs font-bold uppercase tracking-wider">Credit balance</p>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-8xl font-extrabold tracking-[-0.05em]" data-testid="credit-balance">
              {user.credits}
            </span>
            <span className="text-2xl font-extrabold">credit{user.credits === 1 ? "" : "s"}</span>
          </p>
          <p className="mt-2 font-medium text-ink/70">
            {user.credits === 0
              ? "Nothing to search with yet. Which is ironic, given you've lost something."
              : "One credit per search. No find, credit back."}
          </p>
          <Link
            href="/#pricing"
            className="pop mt-7 inline-block rounded-2xl bg-flare px-7 py-4 text-lg font-extrabold text-white transition hover:-translate-y-0.5"
          >
            Buy credits →
          </Link>
        </div>
        <div className="pop-sm rounded-3xl bg-white p-8">
          <p className="font-mono text-xs font-bold uppercase tracking-wider">Orders</p>
          {orders.length === 0 ? (
            <p className="mt-3 text-ink/60">None yet.</p>
          ) : (
            <ul className="mt-3 divide-y-2 divide-ink/10">
              {orders.map((o) => (
                <li key={o.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{findPack(o.pack_id)?.name ?? o.pack_id}</span>
                    <span className="font-mono text-sm font-bold">R{rands(o.amount_cents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 font-mono text-xs text-ink/60">
                    <span>{o.id}</span>
                    <span className={o.status === "paid" ? "font-bold text-ink" : ""}>
                      {o.status}
                      {o.confirmed_via === "dev_return" ? " · DEV" : o.confirmed_via === "itn" ? " · ITN" : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form action={signOut} className="mt-8">
            <button className="font-bold underline decoration-2 underline-offset-4 hover:text-flare">Sign out</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/account">) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-5 py-16">
        <Suspense fallback={<div className="h-96" />}>
          <Account searchParams={props.searchParams as Promise<Flash>} />
        </Suspense>
      </section>
    </SiteShell>
  );
}
