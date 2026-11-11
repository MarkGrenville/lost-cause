import { after } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSearch } from "@/lib/searches";
import { runSearch } from "@/lib/finder";

/** Start the AI search for a waiting search. Idempotent: runSearch claims it exactly once. */
export async function POST(_req: Request, ctx: RouteContext<"/api/searches/[id]/run">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  const search = getSearch(id);
  if (!user || !search || search.user_id !== user.id) return Response.json({ error: "Not found" }, { status: 404 });
  if (search.status === "waiting") after(() => runSearch(id));
  return Response.json({ status: search.status === "waiting" ? "searching" : search.status }, { status: 202 });
}
