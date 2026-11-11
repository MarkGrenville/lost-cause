import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { failIfStuck, getSearch, PHOTO_DAYS } from "@/lib/searches";
import { parseResult } from "@/lib/finder";
import { SiteShell } from "@/components/SiteShell";
import { SearchRunner } from "./SearchRunner";
import { Circles } from "./Circles";
import { Verdict } from "./Verdict";
import { Elapsed } from "./Elapsed";

export const metadata: Metadata = { title: "Search · Lost Cause" };

function Header({ id, status, photoCount, startedAt, durationMs }: { id: string; status: string; photoCount: number; startedAt: string | null; durationMs: number | null }) {
  const looking = status === "waiting" || status === "searching";
  return (
    <div className="pop relative overflow-hidden rounded-[2rem] bg-ink p-8 text-cream md:p-10">
      <div className="flex flex-wrap items-center gap-6">
        <span className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center" aria-hidden>
          {looking && <span className="ring ring-pulse absolute inset-0" />}
          <span className="ring absolute inset-0" />
          <span className={`text-4xl ${looking ? "wobble" : ""}`}>{status === "done" ? "🎯" : status === "failed" ? "🫠" : "👓"}</span>
        </span>
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-sun">Search {id}</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.03em] md:text-5xl" data-testid="search-status">
            {looking && "Our AI is putting its glasses on…"}
            {status === "done" && "Here's where to look."}
            {status === "failed" && "That search fell down the back of the couch."}
          </h1>
          {looking && (
            <p className="mt-2 text-lg font-semibold text-cream/80">
              Looking at {photoCount * 5} zoomed views of {photoCount} photo{photoCount === 1 ? "" : "s"} ·{" "}
              <span className="text-sun"><Elapsed startedAt={startedAt} /></span>
            </p>
          )}
          {status === "done" && durationMs != null && (
            <p className="mt-2 text-lg font-semibold text-cream/80" data-testid="duration">
              The AI looked for <span className="font-mono text-sun">{(durationMs / 1000).toFixed(1)} seconds</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

async function SearchView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/search/${id}`);
  let search = await getSearch(id);
  if (!search || search.user_id !== user.id) notFound();
  if (await failIfStuck(search)) search = (await getSearch(id))!;
  const photos = search.photos;
  const result = search.status === "done" ? parseResult(search.result_json) : null;
  const src = (idx: number) => `/api/searches/${search.id}/photos/${idx}`;

  return (
    <>
      <SearchRunner id={search.id} status={search.status} />
      <Header
        id={search.id}
        status={search.status}
        photoCount={photos.length}
        startedAt={search.started_at}
        durationMs={search.duration_ms}
      />

      {search.status === "failed" && (
        <p className="pop-sm mt-6 rounded-2xl bg-white p-5 font-bold">
          {search.error} Your credit has been put back.
        </p>
      )}

      {result ? (
        <div className="mt-8 space-y-10">
          <Verdict id={search.id} verdict={search.verdict} />
          {result.photos.map((p) => (
            <section key={p.idx} className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
              {p.skipped ? (
                <p className="pop-sm rounded-2xl bg-white p-5 font-bold">Photo {p.idx}: {p.skipped}</p>
              ) : search.photos_deleted ? (
                <p className="pop-sm rounded-2xl bg-white p-5 font-bold">Photo {p.idx} was deleted after {PHOTO_DAYS} days, as promised. The list of spots is still here.</p>
              ) : (
                <Circles src={src(p.idx)} photo={p} />
              )}
              <div className="space-y-4">
                <div className="pop-sm rounded-3xl bg-white p-6">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink/60">Photo {p.idx}</p>
                  <p className="mt-2 text-lg font-bold leading-snug">{p.summary}</p>
                  {p.candidates.length === 0 && !p.skipped ? (
                    <p className="mt-3 text-ink/70">Nothing in this photo looks like it. Honestly.</p>
                  ) : (
                    <ol className="mt-4 space-y-3">
                      {p.candidates.map((c, i) => (
                        <li key={i} className="flex gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink font-mono text-xs font-extrabold ${i === 0 ? "bg-flare text-white" : "bg-sun"}`}>
                            {i + 1}
                          </span>
                          <span>
                            <span className="font-extrabold">{c.label}</span>{" "}
                            <span className="font-mono text-sm font-bold">{Math.round(c.confidence * 100)}%</span>
                            <span className="block text-sm text-ink/70">{c.why}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                {p.where_to_look_next.length > 0 && (
                  <div className="pop-sm rounded-3xl bg-sun p-6">
                    <p className="font-mono text-xs font-bold uppercase tracking-wider">Where to look next</p>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 font-semibold">
                      {p.where_to_look_next.map((w) => <li key={w}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-ink/40 px-5 py-4 font-mono text-xs font-semibold text-ink/70">
            <span>“{search.description}”</span>
            <span>
              {result.calls} AI look{result.calls === 1 ? "" : "s"} · {result.model} · ${result.cost_usd.toFixed(3)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* While it looks: the photos at full size, with a scan line sweeping over each one. */}
          <ul className="space-y-6">
            {photos.map((p) => (
              <li key={p.idx} className="pop relative mx-auto w-fit overflow-hidden rounded-3xl bg-ink">
                {(search.status === "waiting" || search.status === "searching") && <span className="scan-line" aria-hidden />}
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
                <img src={src(p.idx)} alt={`Scene photo ${p.idx}`} className="block max-h-[78vh] w-auto max-w-full" />
              </li>
            ))}
          </ul>
          <div className="pop-sm rounded-3xl bg-white p-6">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink/60">You lost</p>
            <p className="mt-2 whitespace-pre-line text-xl font-bold leading-snug">{search.description}</p>
            <p className="mt-6 font-mono text-xs text-ink/60">1 credit spent · {photos.length} photo{photos.length === 1 ? "" : "s"} · photos deleted after {PHOTO_DAYS} days</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/account" className="font-bold underline decoration-2 underline-offset-4 hover:text-flare">Back to your account</Link>
        <Link href="/find" className="font-bold underline decoration-2 underline-offset-4 hover:text-flare">Start another search</Link>
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/search/[id]">) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Suspense fallback={<div className="h-96" />}>
          <SearchView params={props.params} />
        </Suspense>
      </section>
    </SiteShell>
  );
}
