import { currentUser } from "@/lib/auth";
import { failIfStuck, getSearch } from "@/lib/searches";
import { runSearch } from "@/lib/finder";

/**
 * Run the AI search for a waiting search. Idempotent: runSearch claims it exactly once.
 * The work happens inside this request (Cloud Run may slow a container once it has answered);
 * the page polls for the result meanwhile.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/searches/[id]/run">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  const search = await getSearch(id);
  if (!user || !search || search.user_id !== user.id) return Response.json({ error: "Not found" }, { status: 404 });
  if (search.status === "waiting") await runSearch(id);
  else await failIfStuck(search);
  return Response.json({ status: (await getSearch(id))!.status });
}
