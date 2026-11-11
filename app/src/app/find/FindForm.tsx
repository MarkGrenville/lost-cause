"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_PHOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
// No HEIC: we strip location data before storing, and we can't decode HEIC to do that.
// (iPhones convert to JPEG automatically when HEIC isn't accepted.)
const ACCEPT = "image/jpeg,image/png,image/webp";
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      if (!OK_TYPES.includes(file.type) || isHeic(file)) {
        setError(`"${file.name}" isn't a JPEG, PNG or WebP photo.`);
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
        className={`case p-6 transition md:p-8 ${dragging ? "bg-sun" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label text-flare">01 · Send the scene</p>
            <p className="mt-2 text-ink/70">
              Drop 1–5 photos of where it was last seen. JPEG, PNG or WebP, up to 10 MB each. We strip location data, and delete photos after 7 days.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="label rounded-[3px] border border-ink/30 px-4 py-3 md:hidden"
            >
              Take a photo
            </button>
            <button
              type="button"
              onClick={() => pickRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
              className="label rounded-[3px] border border-flare/70 px-5 py-3 text-flare hover:bg-flare hover:text-white disabled:opacity-50"
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
              <li key={p.key} className="relative overflow-hidden border border-ink/20 bg-cream">
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
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-ink/40 bg-cream/90 text-lg leading-none hover:bg-flare hover:text-white"
                >
                  ×
                </button>
                <span className="label absolute bottom-2 left-2 bg-cream/85 px-2 py-0.5 text-ink">
                  {i + 1}/{MAX_PHOTOS}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="label mt-6 flex h-36 items-center justify-center border border-dashed border-ink/25 text-ink/45">
            Drag photos here
          </div>
        )}
      </div>

      <div className="case p-6 md:p-8">
        <label htmlFor="description" className="label text-flare">
          02 · What did you lose, and roughly where?
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Car keys with a black fob. Last seen near the couch, probably between the cushions."
          className="mt-4 w-full rounded-[3px] border border-ink/20 bg-cream px-5 py-4 text-lg outline-none placeholder:text-ink/35 focus:border-flare"
        />
        <p className="label mt-1 text-right text-ink/50">{description.length}/500</p>
      </div>

      {error && <p className="case px-5 py-3 font-semibold text-flare">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label text-ink/70">
          You have {credits} credit{credits === 1 ? "" : "s"}. This search uses 1.
        </p>
        <button
          disabled={busy}
          className="label rounded-[3px] bg-flare px-8 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Spend 1 credit →"}
        </button>
      </div>
    </form>
  );
}
