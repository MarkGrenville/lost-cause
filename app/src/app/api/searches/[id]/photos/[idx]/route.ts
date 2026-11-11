import fs from "node:fs/promises";
import path from "node:path";
import { currentUser } from "@/lib/auth";
import { getSearch, photosFor, UPLOADS_DIR } from "@/lib/searches";

/** Serve one uploaded photo, only to the person who uploaded it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/searches/[id]/photos/[idx]">) {
  const { id, idx } = await ctx.params;
  const user = await currentUser();
  const search = getSearch(id);
  if (!user || !search || search.user_id !== user.id) return new Response("Not found", { status: 404 });

  const photo = photosFor(id).find((p) => p.idx === Number(idx));
  if (!photo) return new Response("Not found", { status: 404 });

  // file_name is ours ("1.jpg"), never user input, so no path traversal.
  const buf = await fs.readFile(path.join(UPLOADS_DIR, search.id, photo.file_name));
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
