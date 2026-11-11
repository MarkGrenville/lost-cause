import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { creditOrder, getOrder } from "@/lib/orders";
import { payfast, publicBaseUrl } from "@/lib/payfast";

/**
 * PayFast sends the buyer's browser here after paying (return_url).
 *
 * A browser arriving here proves nothing: anyone can type this URL. In production,
 * credits come ONLY from the ITN handler (/api/payfast/notify), so this just shows the
 * account while the ITN lands.
 *
 * ⚠ DEV-ONLY PATH ⚠  PayFast's ITN can't reach localhost, so in development + sandbox
 * this return URL confirms the order itself and adds the credits, marked
 * confirmed_via = 'dev_return' so it can never be mistaken for a real ITN confirmation.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const user = await currentUser();
  const order = await getOrder(orderId);
  // The public address, not req.url: behind App Hosting that is the container (0.0.0.0:8080).
  const account = new URL("/account", publicBaseUrl());

  if (!user || !order || order.user_id !== user.id) return NextResponse.redirect(account);

  // Never in production, never in live mode: there, only a verified ITN adds credits.
  const devOnly = process.env.NODE_ENV !== "production" && payfast.sandbox;
  if (devOnly && order.status === "pending") {
    await creditOrder(order.id, "dev_return");
    account.searchParams.set("paid", order.id);
  } else {
    account.searchParams.set("pending", order.id);
  }
  return NextResponse.redirect(account);
}
