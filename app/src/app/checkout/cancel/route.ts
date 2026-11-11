import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getOrder, setOrderStatus } from "@/lib/orders";

/** PayFast's cancel_url: the buyer backed out, so the order is closed and no credits are added. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const order = getOrder(url.searchParams.get("order") ?? "");
  const user = await currentUser();
  if (user && order && order.user_id === user.id) setOrderStatus(order.id, "cancelled");
  const account = new URL("/account", url);
  account.searchParams.set("cancelled", "1");
  return NextResponse.redirect(account);
}
