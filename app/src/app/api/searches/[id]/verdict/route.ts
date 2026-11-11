import { currentUser } from "@/lib/auth";
import { setVerdict } from "@/lib/searches";

/** POST {"verdict": "found" | "nope"}. "Nope" gives the credit back, once per search. */
export async function POST(req: Request, ctx: RouteContext<"/api/searches/[id]/verdict">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.verdict !== "found" && body.verdict !== "nope") return Response.json({ error: "verdict must be found or nope" }, { status: 400 });
  const res = setVerdict(user.id, id, body.verdict);
  return res.ok ? Response.json(res) : Response.json({ error: res.error }, { status: res.status });
}
