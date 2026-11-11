"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { findPack } from "@/lib/packs";

/** A pack button was pressed: make a pending order (price from the server), then go to checkout. */
export async function buyPack(form: FormData) {
  const pack = findPack(form.get("packId"));
  if (!pack) throw new Error("Unknown pack");

  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent("/#pricing")}`);

  const order = await createOrder(user.id, pack);
  if (!order) redirect("/account?slow=1"); // over the order rate limit
  redirect(`/checkout/${order.id}`);
}
