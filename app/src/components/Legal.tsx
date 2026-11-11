import Link from "next/link";
import { SiteShell } from "./SiteShell";

export const BUSINESS = "Web Footprint";
export const EMAIL = "info@webfootprint.co.za";

export function Email() {
  return <a href={`mailto:${EMAIL}`} className="font-semibold underline">{EMAIL}</a>;
}

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

export function LegalLinks() {
  return (
    <span className="flex flex-wrap gap-4">
      {LEGAL_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-flare">
          {l.label}
        </Link>
      ))}
    </span>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <SiteShell>
      <article className="case mx-auto my-14 max-w-3xl px-8 py-12 md:px-12">
        <p className="label text-flare">Last updated {updated}</p>
        <h1 className="mt-2 text-6xl uppercase">{title}</h1>
        <div className="legal mt-8 space-y-5 text-lg leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-extrabold [&_li]:ml-6 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </article>
    </SiteShell>
  );
}
