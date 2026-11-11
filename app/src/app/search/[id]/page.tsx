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

/** Version 2: the search reads like a short case report. */
function Header({ id, status, photoCount, startedAt, durationMs, subject, best }: {
  id: string; status: string; photoCount: number; startedAt: string | null; durationMs: number | null; subject: string; best: number | null;
}) {
  const looking = status === "waiting" || status === "searching";
  const verdict =
    status === "failed" ? "Closed: search failed"
    : looking ? "Searching"
    : best == null ? "Not located"
    : best >= 0.6 ? "Located"
    : "Possible sightings";
  const tone = status === "done" && best != null && best >= 0.6 ? "text-mint" : looking ? "text-flare" : "text-ink/70";
  return (
    <div className="case p-8 md:p-10">
      <p className="label text-ink/60">
        Case {id} · Subject: <span className="text-ink">{subject.length > 48 ? subject.slice(0, 47) + "…" : subject}</span>
      </p>
      <h1 className={`mt-4 text-5xl uppercase md:text-6xl ${tone}`} data-testid="search-status">
        {verdict}
      </h1>
      <p className="label mt-4 text-ink/70">
        {photoCount} photo{photoCount === 1 ? "" : "s"} · {photoCount * 5} views
        {looking && (
          <>
            {" "}· Time <span className="text-flare"><Elapsed startedAt={startedAt} /></span>
          </>
        )}
        {status === "done" && durationMs != null && (
          <span data-testid="duration"> · Searched in <span className="text-flare">{(durationMs / 1000).toFixed(1)} s</span></span>
        )}
      </p>
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
  const confidences = result ? result.photos.flatMap((p) => p.candidates.map((c) => c.confidence)) : [];
  const bestConfidence = confidences.length ? Math.max(...confidences) : null;
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
        subject={search.description}
        best={bestConfidence}
      />

      {search.status === "failed" && (
        <p className="case mt-6 p-5 font-semibold">
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
                <div className="case p-6">
                  <p className="label text-ink/60">Findings · Photo {p.idx}</p>
                  <p className="mt-2 text-lg font-medium leading-snug">{p.summary}</p>
                  {p.candidates.length === 0 && !p.skipped ? (
                    <p className="mt-3 text-ink/70">Nothing in this photo matches the description.</p>
                  ) : (
                    <ol className="mt-4 space-y-3">
                      {p.candidates.map((c, i) => (
                        <li key={i} className="flex gap-3">
                          <span className={`label mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border ${i === 0 ? "border-signal text-signal" : "border-flare/60 text-flare"}`}>
                            {i + 1}
                          </span>
                          <span>
                            <span className="font-semibold">{c.label}</span>{" "}
                            <span className="label text-flare">{Math.round(c.confidence * 100)}% confidence</span>
                            <span className="block text-sm text-ink/70">{c.why}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                {p.where_to_look_next.length > 0 && (
                  <div className="case p-6">
                    <p className="label text-flare">Where to look next</p>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5">
                      {p.where_to_look_next.map((w) => <li key={w}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          ))}
          <div className="label flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 px-1 py-4 text-ink/60">
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
              <li key={p.idx} className="case relative mx-auto w-fit overflow-hidden">
                {(search.status === "waiting" || search.status === "searching") && <span className="scan-line" aria-hidden />}
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
                <img src={src(p.idx)} alt={`Scene photo ${p.idx}`} className="block max-h-[78vh] w-auto max-w-full" />
              </li>
            ))}
          </ul>
          <div className="case p-6">
            <p className="label text-ink/60">Subject</p>
            <p className="mt-2 whitespace-pre-line text-xl font-medium leading-snug">{search.description}</p>
            <p className="label mt-6 text-ink/60">1 credit spent · {photos.length} photo{photos.length === 1 ? "" : "s"} · photos deleted after {PHOTO_DAYS} days</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/account" className="label text-ink/70 hover:text-flare">Back to your account</Link>
        <Link href="/find" className="label text-ink/70 hover:text-flare">Open another case</Link>
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
