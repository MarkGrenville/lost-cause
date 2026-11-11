import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, Email, LegalPage } from "@/components/Legal";

export const metadata: Metadata = { title: "Terms · Lost Cause" };

export default function Page() {
  return (
    <LegalPage title="Terms of use" updated="11 November 2026">
      <p>
        Lost Cause is run by {BUSINESS} (&ldquo;we&rdquo;), contactable at <Email />. By using the site you agree to these terms.
        They are short on purpose.
      </p>

      <h2>What Lost Cause does</h2>
      <p>
        You upload photos of the place you lost something and describe it. An AI model looks at the photos and circles the spots where it
        thinks the thing might be. It is a well-informed guess, not a promise. It can only see what is in your photos, and it can be wrong.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You sign in with Google. Keep your Google account safe: whoever can sign in to it can use your credits.</li>
        <li>You must be 18 or older, or have a parent or guardian&apos;s permission.</li>
      </ul>

      <h2>Credits and prices</h2>
      <ul>
        <li>Credits are sold in packs. Prices are shown in South African rand (ZAR) and paid through PayFast. We never see your card details.</li>
        <li>One credit pays for one search of up to 5 photos.</li>
        <li>Credits don&apos;t expire. They can&apos;t be transferred, and they&apos;re only paid back as our <Link href="/refunds" className="underline">refund policy</Link> says.</li>
      </ul>

      <h2>Your photos</h2>
      <ul>
        <li>Only upload photos you took or have the right to use.</li>
        <li>We don&apos;t search photos that are mainly of a person. Those are declined and deleted.</li>
        <li>Don&apos;t upload ID documents, bank cards or anything illegal.</li>
        <li>We remove location data from photos when you upload them and delete the photos after 7 days. See our <Link href="/privacy" className="underline">privacy policy</Link>.</li>
      </ul>

      <h2>Fair use</h2>
      <p>
        To keep the service running for everyone there is a limit on searches per hour, and a daily budget for the AI. When the budget is used
        up, searches pause until the next day. A paused search never takes a credit.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        We provide Lost Cause as it is. As far as the law allows, we aren&apos;t responsible for anything you don&apos;t find, and our total
        responsibility to you is limited to what you paid us in the 12 months before the problem. Nothing here takes away your rights under
        South Africa&apos;s Consumer Protection Act or Electronic Communications and Transactions Act.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top says when. South African law applies. Questions? <Link href="/contact" className="underline">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
