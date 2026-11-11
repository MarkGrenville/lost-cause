import { Fragment } from "react";
import { Nav } from "@/components/SiteShell";
import { PACKS } from "@/lib/packs";
import { buyPack } from "./checkout/actions";
import { LegalLinks } from "@/components/Legal";

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.15fr_1fr] md:pt-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-white px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-mint" /> AI for things that walked off
          </p>
          <h1 className="text-[clamp(5rem,11vw,8.5rem)] font-extrabold leading-[0.85] tracking-[-0.04em]">
            Lost
            <br />
            <span className="relative inline-block">
              Cause
              <svg
                aria-hidden
                viewBox="0 0 300 120"
                className="pointer-events-none absolute -inset-x-[8%] -inset-y-[18%] h-[136%] w-[116%]"
                preserveAspectRatio="none"
              >
                <ellipse
                  cx="150" cy="62" rx="142" ry="50"
                  fill="none" stroke="#ff4d1f" strokeWidth="7"
                  strokeLinecap="round" transform="rotate(-4 150 62)"
                  strokeDasharray="860" strokeDashoffset="30"
                />
              </svg>
            </span>
            <span className="text-flare">.</span>
          </h1>
          <p className="mt-8 max-w-md text-2xl font-bold leading-snug md:text-3xl">
            We specialise in lost causes.
          </p>
          <p className="mt-3 max-w-md text-lg text-ink/70">
            Keys, remotes, AirPods, that one sock. Snap a photo of the scene of the crime and our AI
            circles exactly where to look.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="/find"
              className="pop rounded-2xl bg-flare px-7 py-4 text-lg font-extrabold text-white transition hover:-translate-y-1 hover:shadow-[8px_8px_0_#141210]"
            >
              Find it for me →
            </a>
            <a href="#how" className="text-lg font-bold underline decoration-[3px] underline-offset-4 hover:text-flare">
              How does that even work?
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-ink/60">R10 a find. No find, credit back. No lecture, ever.</p>
        </div>

        <HeroScene />
      </div>
    </section>
  );
}

/** A fake "photo" of a messy couch with the AI circles on it. */
function HeroScene() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="pop relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-sky">
        {/* wall + floor */}
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[#e9b77a]" />
        <div className="absolute inset-x-0 bottom-[38%] h-2 bg-ink/20" />
        {/* couch */}
        <div className="absolute bottom-[30%] left-[8%] right-[8%] h-[32%] rounded-t-[2.5rem] border-[3px] border-ink bg-[#7c5cff]" />
        <div className="absolute bottom-[22%] left-[4%] right-[4%] h-[16%] rounded-2xl border-[3px] border-ink bg-[#9b82ff]" />
        <div className="absolute bottom-[22%] left-[4%] h-[30%] w-[12%] rounded-2xl border-[3px] border-ink bg-[#6a4be8]" />
        <div className="absolute bottom-[22%] right-[4%] h-[30%] w-[12%] rounded-2xl border-[3px] border-ink bg-[#6a4be8]" />
        {/* cushion gap: the culprit */}
        <div className="absolute bottom-[37%] left-[44%] h-[3px] w-[16%] bg-ink" />
        {/* plant */}
        <div className="absolute bottom-[38%] right-[6%] h-[12%] w-[10%] rounded-b-lg border-[3px] border-ink bg-flare" />
        <div className="absolute bottom-[49%] right-[5%] h-[14%] w-[12%] rounded-full border-[3px] border-ink bg-mint" />
        {/* frame on wall */}
        <div className="absolute left-[30%] top-[10%] h-[18%] w-[40%] rotate-[-3deg] border-[3px] border-ink bg-sun" />

        {/* the circles */}
        <div className="absolute bottom-[31%] left-[40%] h-20 w-20">
          <span className="ring ring-pulse absolute inset-0" />
          <span className="ring absolute inset-0" />
        </div>
        <div className="absolute bottom-[8%] left-[18%] h-12 w-12 opacity-70">
          <span className="absolute inset-0 rounded-full border-[3px] border-dashed border-flare" />
        </div>

        {/* labels */}
        <div className="pop-sm absolute bottom-[50%] left-[50%] rounded-xl bg-white px-3 py-1.5 text-sm font-bold">
          Keys · 92% sure
        </div>
        <div className="absolute bottom-[3%] left-[30%] rounded-lg bg-white/90 px-2 py-0.5 font-mono text-[11px] font-semibold">
          maybe under here · 31%
        </div>
      </div>
      <div className="wobble pop-sm absolute -right-3 -top-4 rotate-6 rounded-full bg-sun px-4 py-2 text-sm font-extrabold md:-right-8">
        Found in 6s!
      </div>
    </div>
  );
}

function SectionTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="mb-12 max-w-2xl">
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-flare">{kicker}</p>
      <h2 className="text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[0.92] tracking-[-0.03em]">
        {children}
      </h2>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Snap the scene",
    body: "Take 1–5 photos of where it was last seen. Messy is fine. Messy is the whole point.",
    color: "bg-sky",
    icon: "📸",
  },
  {
    n: "02",
    title: "Spend a credit",
    body: "Tell us what you lost (“small, black, judges me”). One credit per search, R10 a find.",
    color: "bg-sun",
    icon: "🪙",
  },
  {
    n: "03",
    title: "Follow the circles",
    body: "Our AI zooms into every corner and circles the likeliest spots, ranked by how sure it is.",
    color: "bg-mint",
    icon: "⭕",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t-[3px] border-ink bg-white">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionTitle kicker="How it works">
          Three steps.
          <br />
          Zero search parties.
        </SectionTitle>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className={`pop rounded-3xl ${s.color} p-7 transition hover:-translate-y-1`}>
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm font-bold">{s.n}</span>
                <span className="text-4xl" aria-hidden>
                  {s.icon}
                </span>
              </div>
              <h3 className="mt-10 text-3xl font-extrabold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-base font-medium leading-relaxed text-ink/80">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const MOM_ROWS: [string, string, string][] = [
  ["Time to find it", "4 seconds", "6 seconds"],
  ["Lecture included", "Yes, extended edition", "No lecture"],
  ["Mentions it was “right in front of you”", "Every time", "Never (we draw a circle instead)"],
  ["Brings up the time you lost the car keys in 2014", "Obviously", "We weren't there"],
  ["Available at 2am", "Technically. Not happily.", "Yes"],
  ["Asks “have you looked properly?”", "Before you finish the sentence", "We just look"],
  ["Cost", "Guilt, payable forever", "R10 a find"],
];

function VsMom() {
  return (
    <section id="mom" className="scroll-mt-20 border-t-[3px] border-ink bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-sun">
              The honest comparison
            </p>
            <h2 className="text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[0.92] tracking-[-0.03em]">
              Lost Cause <span className="text-flare">vs</span> Mom
            </h2>
          </div>
          <p className="max-w-xs text-lg text-cream/70">
            Mom is faster. We&apos;ll admit that. But have you considered: no lecture.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border-[3px] border-cream shadow-[8px_8px_0_#ff4d1f]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-cream text-ink">
                <th className="hidden w-[38%] p-5 md:table-cell" />
                <th className="p-4 text-lg font-extrabold md:p-5 md:text-2xl">
                  <span aria-hidden>👩</span> Mom
                </th>
                <th className="bg-sun p-4 text-lg font-extrabold md:p-5 md:text-2xl">
                  <span aria-hidden>⭕</span> Lost Cause
                </th>
              </tr>
            </thead>
            <tbody>
              {MOM_ROWS.map(([label, mom, us], i) => (
                <Fragment key={label}>
                  {/* mobile: the label gets its own full-width row */}
                  <tr className="md:hidden">
                    <th
                      scope="colgroup"
                      colSpan={2}
                      className="border-t border-cream/15 px-4 pb-0 pt-4 font-mono text-xs font-semibold uppercase tracking-wide text-cream/60"
                    >
                      {label}
                    </th>
                  </tr>
                  <tr className={i % 2 ? "md:bg-white/[0.04]" : ""}>
                    <th scope="row" className="hidden border-t border-cream/15 p-5 text-base font-semibold text-cream/70 md:table-cell">
                      {label}
                    </th>
                    <td className="px-4 pb-4 pt-1.5 text-base font-bold md:border-t md:border-cream/15 md:p-5 md:text-lg">{mom}</td>
                    <td className="bg-sun/10 px-4 pb-4 pt-1.5 text-base font-bold text-sun md:border-t md:border-cream/15 md:p-5 md:text-lg">
                      {us}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 font-mono text-xs text-cream/50">
          * Mom remains undefeated on speed. We are working on it. She is not.
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t-[3px] border-ink">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionTitle kicker="Credit packs">
          R10 a find.
          <br />
          <span className="text-flare">Not per month.</span>
        </SectionTitle>
        <div className="grid gap-7 md:grid-cols-3">
          {PACKS.map((p) => (
            <div key={p.name} className={`pop relative flex flex-col rounded-3xl ${p.color} p-7`}>
              {p.badge && (
                <span className="pop-sm absolute -top-4 right-6 rotate-3 rounded-full bg-flare px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                  {p.badge}
                </span>
              )}
              <h3 className="text-2xl font-extrabold tracking-tight">{p.name}</h3>
              <p className="mt-1 font-mono text-sm font-semibold text-ink/70">
                {p.searches} searches · R{Math.round(p.priceCents / 100 / p.searches)} each
              </p>
              <p className="mt-7 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold">R</span>
                <span className="text-7xl font-extrabold tracking-[-0.04em]">{p.priceCents / 100}</span>
              </p>
              <p className="mt-5 flex-1 text-base font-medium leading-relaxed text-ink/80">{p.blurb}</p>
              <form action={buyPack} className="mt-8">
                <input type="hidden" name="packId" value={p.id} />
                <button className="pop-sm w-full rounded-2xl bg-ink px-5 py-3.5 text-base font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-flare">
                  Buy {p.searches} searches →
                </button>
              </form>
            </div>
          ))}
        </div>
        <p className="mt-8 font-mono text-xs text-ink/60">
          Prices in South African Rand (ZAR). Credits never expire. Unlike your patience. Payments run on the PayFast sandbox: no real money.
        </p>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "What if you don't find it?",
    a: "No find, credit back. If our circles come up empty, tap “Nope” and the credit goes straight back into your account. No forms, no arguing, no lecture.",
  },
  {
    q: "Does it actually work?",
    a: "It zooms into your photos tile by tile, the way you would if you had patience, and circles anything that looks like what you described. It can't see through walls, couches or teenagers.",
  },
  {
    q: "Can it find my motivation / my youth / the plot?",
    a: "Objects only. Physical things that are physically somewhere. We've tried. It just circles the couch.",
  },
  {
    q: "What happens to my photos?",
    a: "They're used for your search and nothing else, and they're deleted automatically. We don't need to see your laundry pile for longer than necessary.",
  },
  {
    q: "Is Mom going to be put out of a job?",
    a: "Never. She's still faster. We just don't bring up 2014.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t-[3px] border-ink bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.4fr]">
        <SectionTitle kicker="FAQ">Questions we get, mostly from Mom.</SectionTitle>
        <div className="space-y-4">
          {FAQS.map((f, i) => (
            <details key={f.q} open={i === 0} className="pop-sm group rounded-2xl bg-cream p-5 md:p-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-lg font-extrabold md:text-xl">
                {f.q}
                <span className="faq-plus shrink-0 text-3xl leading-none text-flare transition">+</span>
              </summary>
              <p className="mt-3 text-base font-medium leading-relaxed text-ink/80">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-[3px] border-ink bg-flare text-ink">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-[clamp(2.6rem,9vw,6.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
          Lost it?
          <br />
          We&apos;re on it.
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-ink pt-6 font-mono text-sm font-semibold">
          <span>© {2026} Web Footprint · Lost Cause</span>
          <span>Made in South Africa, between the couch cushions.</span>
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
        <VsMom />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
