"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_PHOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

type Picked = { file: File; url: string | null; key: string };

const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

export function FindForm({ credits }: { credits: number }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Free preview URLs on unmount (removal frees its own below).
  const live = useRef<Picked[]>([]);
  useEffect(() => {
    live.current = photos;
  }, [photos]);
  useEffect(() => () => live.current.forEach((p) => p.url && URL.revokeObjectURL(p.url)), []);

  function add(list: FileList | File[]) {
    setError(null);
    const next = [...photos];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_PHOTOS) {
        setError(`Up to ${MAX_PHOTOS} photos per search.`);
        break;
      }
      if (!OK_TYPES.includes(file.type) && !isHeic(file)) {
        setError(`"${file.name}" isn't a JPEG, PNG, WebP or HEIC photo.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" is over 10 MB.`);
        continue;
      }
      // Browsers can't preview HEIC, so those get a tile instead of a thumbnail.
      next.push({ file, url: isHeic(file) ? null : URL.createObjectURL(file), key: `${file.name}-${file.size}-${Math.random()}` });
    }
    setPhotos(next);
  }

  function remove(key: string) {
    const gone = photos.find((p) => p.key === key);
    if (gone?.url) URL.revokeObjectURL(gone.url);
    setPhotos((ps) => ps.filter((p) => p.key !== key));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) return setError("Add at least one photo of the scene.");
    if (description.trim().length < 3) return setError("Tell us what you lost (a few words is fine).");
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("description", description);
    photos.forEach((p) => body.append("photos", p.file, p.file.name));
    const res = await fetch("/api/searches", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      if (res.status === 402) return router.refresh(); // server shows the out-of-credits panel
      return setError(json.error ?? "Something went wrong. Even we lose things.");
    }
    // Next keeps this page mounted in the background, so start the next search clean.
    photos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setPhotos([]);
    setDescription("");
    setBusy(false);
    router.push(`/search/${json.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`pop rounded-3xl border-dashed p-6 transition md:p-8 ${dragging ? "bg-sun" : "bg-white"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight">Snap the scene</p>
            <p className="text-ink/70">
              Drop 1–5 photos of where it was last seen. JPEG, PNG, WebP or HEIC, up to 10 MB each.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="pop-sm rounded-2xl bg-sky px-4 py-3 font-extrabold md:hidden"
            >
              📸 Take a photo
            </button>
            <button
              type="button"
              onClick={() => pickRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
              className="pop-sm rounded-2xl bg-sun px-5 py-3 font-extrabold disabled:opacity-50"
            >
              Choose photos
            </button>
          </div>
        </div>
        <input
          ref={pickRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          data-testid="photo-input"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />

        {photos.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {photos.map((p, i) => (
              <li key={p.key} className="pop-sm relative overflow-hidden rounded-2xl bg-cream">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img src={p.url} alt={`Photo ${i + 1}: ${p.file.name}`} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-3 text-center font-mono text-xs font-bold">
                    HEIC photo
                    <br />
                    {p.file.name}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(p.key)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-lg font-extrabold leading-none hover:bg-flare hover:text-white"
                >
                  ×
                </button>
                <span className="absolute bottom-2 left-2 rounded-md bg-ink px-2 py-0.5 font-mono text-[11px] font-bold text-cream">
                  {i + 1}/{MAX_PHOTOS}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex h-36 items-center justify-center rounded-2xl border-[3px] border-dashed border-ink/30 text-lg font-bold text-ink/40">
            Drag photos here
          </div>
        )}
      </div>

      <div className="pop rounded-3xl bg-white p-6 md:p-8">
        <label htmlFor="description" className="text-2xl font-extrabold tracking-tight">
          What did you lose, and roughly where?
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Car keys with a black fob. Last seen near the purple couch, probably fell between the cushions."
          className="pop-sm mt-4 w-full rounded-2xl bg-cream px-5 py-4 text-lg font-semibold outline-none placeholder:text-ink/35 focus:bg-sun/20"
        />
        <p className="mt-1 text-right font-mono text-xs text-ink/50">{description.length}/500</p>
      </div>

      {error && <p className="pop-sm rounded-2xl bg-white px-5 py-3 font-bold text-flare">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-sm font-semibold">
          You have {credits} credit{credits === 1 ? "" : "s"}. This search uses 1.
        </p>
        <button
          disabled={busy}
          className="pop rounded-2xl bg-flare px-8 py-4 text-xl font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Spend 1 credit →"}
        </button>
      </div>
    </form>
  );
}
