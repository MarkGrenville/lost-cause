import type { Metadata } from "next";
import { BUSINESS, Email, LegalPage } from "@/components/Legal";

export const metadata: Metadata = { title: "Contact · Lost Cause" };

export default function Page() {
  return (
    <LegalPage title="Contact" updated="11 November 2026">
      <p>Lost Cause is run by:</p>
      <div className="pop-sm rounded-3xl bg-white p-6 font-semibold">
        <p className="text-2xl font-extrabold">{BUSINESS}</p>
        <p className="mt-2">Email: <Email /></p>
      </div>
      <p>
        About an order? Include your order number (it starts with <span className="font-mono">LC-</span> and is on your account page). We
        aim to reply within 2 working days.
      </p>
      <p>We can&apos;t help find things by email. That&apos;s what the circles are for.</p>
    </LegalPage>
  );
}
