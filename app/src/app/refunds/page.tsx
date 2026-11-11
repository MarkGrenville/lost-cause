import type { Metadata } from "next";
import Link from "next/link";
import { Email, LegalPage } from "@/components/Legal";

export const metadata: Metadata = { title: "Refunds · Lost Cause" };

export default function Page() {
  return (
    <LegalPage title="Refunds" updated="11 November 2026">
      <h2>No find, credit back</h2>
      <p>
        When a search finishes, tap <strong>Nope</strong> if the circles didn&apos;t help. The credit goes straight back into your account.
        One credit back per search. No forms.
      </p>

      <h2>When the search itself fails</h2>
      <p>
        If a search breaks on our side, the credit goes back automatically. If searches are paused because we&apos;ve hit the day&apos;s AI
        budget, no credit is taken at all.
      </p>

      <h2>Money back for unused credits</h2>
      <p>
        Email <Email /> within 30 days of buying a pack, with your order number (it starts with <span className="font-mono">LC-</span> and
        is on your account page). We refund the credits from that order you haven&apos;t used, at R10 each, to the way you paid.
      </p>

      <h2>Something else wrong?</h2>
      <p>
        Charged twice, or paid and no credits arrived? <Link href="/contact" className="underline">Contact us</Link> with your order number
        and we&apos;ll put it right. Your rights under the Consumer Protection Act and the Electronic Communications and Transactions Act
        still apply.
      </p>
    </LegalPage>
  );
}
