import { currentUser } from "@/lib/auth";
import { bucket } from "@/lib/firebase";
import { getSearch } from "@/lib/searches";

/** Serve one uploaded photo from private Cloud Storage, only to the person who uploaded it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/searches/[id]/photos/[idx]">) {
  const { id, idx } = await ctx.params;
  const user = await currentUser();
  const search = await getSearch(id);
  if (!user || !search || search.user_id !== user.id) return new Response("Not found", { status: 404 });

  const photo = search.photos.find((p) => p.idx === Number(idx));
  if (!photo) return new Response("Not found", { status: 404 });

  // photo.path is ours ("searches/<id>/1.jpg"), never user input.
  const file = bucket().file(photo.path);
  const [exists] = await file.exists();
  if (!exists) return new Response("Deleted", { status: 410 }); // after 7 days, or declined
  const [buf] = await file.download();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
