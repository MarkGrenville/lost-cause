import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOrder } from "@/lib/orders";
import { findPack, rands } from "@/lib/packs";
import { checkoutFields, payfast, publicBaseUrl } from "@/lib/payfast";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = { title: "Checkout · Lost Cause" };

async function Checkout({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/checkout/${orderId}`);

  const order = await getOrder(orderId);
  const pack = order && findPack(order.pack_id);
  if (!order || !pack || order.user_id !== user.id) notFound();
  if (order.status !== "pending") redirect("/account");

  const base = publicBaseUrl();
  // Signed server-side. The passphrase is hashed in, never sent.
  const fields = checkoutFields({
    orderId: order.id,
    amount: rands(order.amount_cents),
    itemName: `Lost Cause: ${pack.name}`,
    itemDescription: `${pack.searches} searches`,
    email: user.email,
    returnUrl: `${base}/checkout/return?order=${order.id}`,
    cancelUrl: `${base}/checkout/cancel?order=${order.id}`,
    notifyUrl: `${base}/api/payfast/notify`,
  });

  return (
    <>
      <div className="case p-8">
        <p className="label text-ink/60">Order {order.id}</p>
        <h1 className="mt-2 text-5xl uppercase">{pack.name}</h1>
        <p className="mt-1 text-lg text-ink/70">{pack.searches} credits for {user.email}</p>
        <p className="mt-6 flex items-baseline gap-1">
          <span className="text-2xl font-extrabold">R</span>
          <span className="font-head text-7xl">{rands(order.amount_cents)}</span>
        </p>
      </div>

      <form action={payfast.processUrl} method="post" className="mt-6">
        {fields.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button className="label w-full rounded-[3px] bg-flare px-6 py-5 text-sm font-semibold text-white transition hover:brightness-110">
          Pay R{rands(order.amount_cents)} with PayFast →
        </button>
      </form>
      {payfast.sandbox && (
        <p className="label mt-4 border border-dashed border-ink/40 px-4 py-3">
          SANDBOX: this goes to sandbox.payfast.co.za. No real money moves.
        </p>
      )}
    </>
  );
}

export default function Page(props: PageProps<"/checkout/[orderId]">) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-lg px-5 py-16">
        <p className="label mb-4 text-flare">Checkout</p>
        <Suspense fallback={<div className="h-96" />}>
          <Checkout params={props.params} />
        </Suspense>
      </section>
    </SiteShell>
  );
}
