import { currentUser } from "@/lib/auth";
import { createSearch, MAX_PHOTOS } from "@/lib/searches";

/** Create a search: multipart form with `description` and 1–5 `photos`. Spends 1 credit. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (user.credits < 1) return Response.json({ error: "You're out of lost causes. Buy credits to search." }, { status: 402 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "That upload didn't come through. Try again?" }, { status: 400 });
  }

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return Response.json({ error: `Up to ${MAX_PHOTOS} photos per search.` }, { status: 400 });

  const res = await createSearch(user.id, String(form.get("description") ?? ""), files);
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
  return Response.json({ id: res.searchId }, { status: 201 });
}
