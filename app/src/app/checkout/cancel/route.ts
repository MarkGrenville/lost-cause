import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getOrder, setOrderStatus } from "@/lib/orders";
import { publicBaseUrl } from "@/lib/payfast";

/** PayFast's cancel_url: the buyer backed out, so the order is closed and no credits are added. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const order = await getOrder(url.searchParams.get("order") ?? "");
  const user = await currentUser();
  if (user && order && order.user_id === user.id) await setOrderStatus(order.id, "cancelled");
  // The public address, not req.url: behind App Hosting that is the container (0.0.0.0:8080).
  const account = new URL("/account", publicBaseUrl());
  account.searchParams.set("cancelled", "1");
  return NextResponse.redirect(account);
}
