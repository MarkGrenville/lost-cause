import { Nav, Crosshair } from "@/components/SiteShell";
import { LegalLinks } from "@/components/Legal";
import { PACKS } from "@/lib/packs";
import { buyPack } from "./checkout/actions";

/** Version 2 hero: the ChatGPT-made desk photo, with the headline in its dark left third. */
function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-ink/15 bg-cream bg-cover bg-right"
      style={{ backgroundImage: "linear-gradient(90deg, #0b1220 0%, #0b1220 30%, rgba(11,18,32,0.55) 55%, rgba(11,18,32,0) 75%), url(/art/spy-hero.jpg)" }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col justify-center px-5 py-20">
        <p className="label text-flare">Case file · Lost property</p>
        <h1 className="mt-4 text-[clamp(4.5rem,10vw,8rem)] uppercase leading-[0.88]">
          Lost
          <br />
          Cause
        </h1>
        <p className="mt-6 max-w-md text-2xl font-medium leading-snug">We specialise in lost causes.</p>
        <p className="mt-3 max-w-md text-lg leading-relaxed text-ink/75">
          Send photos of where you lost something. The AI studies them and marks where to look.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <a href="/find" className="label rounded-[3px] bg-flare px-7 py-4 text-sm font-semibold text-white transition hover:brightness-110">
            Open a case →
          </a>
          <a href="#how" className="label text-ink/80 underline decoration-ink/30 underline-offset-8 hover:text-flare">
            How it works
          </a>
        </div>
        <p className="label mt-8 text-ink/55">R10 a find · No find, credit back</p>
      </div>
    </section>
  );
}

function SectionTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="mb-12 max-w-2xl">
      <p className="label mb-3 text-flare">{kicker}</p>
      <h2 className="text-[clamp(2.6rem,5.5vw,4.25rem)] uppercase leading-[0.95]">{children}</h2>
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Send the scene", body: "One to five photos of where it was last seen. Location data is removed before anything is stored." },
  { n: "02", title: "Say what's missing", body: "A sentence is enough: what it is, what it looks like, where you last had it. One credit per search." },
  { n: "03", title: "Get where to look", body: "The AI checks the whole photo and four zoomed-in views, then marks each likely spot with how sure it is." },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionTitle kicker="How it works">Three steps.</SectionTitle>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="case p-7">
              <span className="label text-flare">Step {s.n}</span>
              <h3 className="mt-8 text-3xl uppercase">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-ink/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionTitle kicker="Credits">R10 a find.</SectionTitle>
        <p className="-mt-6 mb-12 max-w-xl text-lg text-ink/75">
          Buy a pack once, use it when you need it. If the AI doesn&apos;t help, mark it &ldquo;Nope&rdquo; and the credit comes back.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {PACKS.map((p) => (
            <div key={p.id} className="case flex flex-col p-7">
              <div className="flex items-center justify-between">
                <span className="label text-ink/60">{p.searches} credits</span>
                {p.badge && <span className="label text-flare">{p.badge}</span>}
              </div>
              <h3 className="mt-6 text-4xl uppercase">{p.name}</h3>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-2xl font-medium">R</span>
                <span className="font-head text-7xl">{p.priceCents / 100}</span>
              </p>
              <p className="label mt-1 text-ink/55">R{Math.round(p.priceCents / 100 / p.searches)} each</p>
              <p className="mt-5 flex-1 leading-relaxed text-ink/75">{p.blurb}</p>
              <form action={buyPack} className="mt-8">
                <input type="hidden" name="packId" value={p.id} />
                <button className="label w-full rounded-[3px] bg-flare px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110">
                  Buy {p.name} →
                </button>
              </form>
            </div>
          ))}
        </div>
        <p className="label mt-6 text-ink/55">Paid securely through PayFast, in rand</p>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "What if it doesn't find it?",
    a: "No find, credit back. Mark the search “Nope” and the credit returns to your account, once per search. If a search fails on our side, the credit comes back automatically.",
  },
  {
    q: "How does it look?",
    a: "Each photo is sent to the AI as the whole picture plus four overlapping zoomed-in quarters, so small things aren't lost when the photo is shrunk. It reports each likely spot with a confidence, and where to look next.",
  },
  {
    q: "What can it find?",
    a: "Physical things that are somewhere in your photos. It can't see inside a drawer or under a cushion, and it says so with a low confidence rather than guessing.",
  },
  {
    q: "What happens to my photos?",
    a: "Location data is removed when you upload. Only you can see them, and they're deleted after 7 days. Photos that are mainly of a person are declined.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.4fr]">
        <SectionTitle kicker="Questions">Before you open a case.</SectionTitle>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details key={f.q} open={i === 0} className="case group p-5 md:p-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <span className="faq-plus shrink-0 text-2xl leading-none text-flare transition">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink/75">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-cream/90">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex items-center gap-4">
          <Crosshair className="h-10 w-10 text-signal" />
          <p className="font-head text-5xl uppercase">Lost it? Open a case.</p>
        </div>
        <div className="label mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-6 text-ink/65">
          <span>© 2026 Web Footprint · Lost Cause</span>
          <span>Made in South Africa</span>
          <LegalLinks />
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
