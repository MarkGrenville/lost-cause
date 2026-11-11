import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, Email, LegalPage } from "@/components/Legal";

export const metadata: Metadata = { title: "Privacy · Lost Cause" };

export default function Page() {
  return (
    <LegalPage title="Privacy policy" updated="11 November 2026">
      <p>
        {BUSINESS} is responsible for your personal information on Lost Cause, under South Africa&apos;s Protection of Personal
        Information Act (POPIA). That includes your photos.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your Google sign-in:</strong> your email address and a Firebase user ID. Not your password, contacts or anything else.</li>
        <li><strong>Your searches:</strong> the photos you upload, what you said you lost, and where the AI said to look.</li>
        <li><strong>Your orders:</strong> which pack, the amount, and PayFast&apos;s payment reference. PayFast handles your card or bank details; we never see them.</li>
        <li><strong>Technical logs:</strong> such as IP addresses, kept by our hosting provider to run the site and stop abuse.</li>
      </ul>

      <h2>Your photos</h2>
      <ul>
        <li>When you upload a photo we remove its hidden data (EXIF), including GPS location, before we store it.</li>
        <li>Photos are private. Only you can see them, after signing in.</li>
        <li>Photos are deleted automatically after <strong>7 days</strong>. What you lost and where the AI said to look stay in your account.</li>
        <li>Photos that are mainly of a person are declined and deleted straight away.</li>
      </ul>

      <h2>Who else handles it</h2>
      <ul>
        <li><strong>Google (Firebase):</strong> stores the database and your photos in Johannesburg, South Africa, and runs the site from the Netherlands.</li>
        <li><strong>Anthropic:</strong> its Claude AI looks at your photos and description to find the spots. They are sent to Anthropic in the United States for that, and handled under Anthropic&apos;s commercial terms.</li>
        <li><strong>PayFast:</strong> takes your payment.</li>
      </ul>
      <p>We don&apos;t sell your information, and we don&apos;t use advertising or tracking cookies.</p>

      <h2>Cookies</h2>
      <p>One cookie keeps you signed in. That&apos;s it.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Photos: 7 days.</li>
        <li>Your account and searches: until you ask us to delete your account.</li>
        <li>Orders: 5 years, because South African tax law requires it.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your information, or delete your account. Email <Email />. If you&apos;re not happy with our answer, you can complain to the Information Regulator
        (inforegulator.org.za).
      </p>
      <p>
        See also our <Link href="/terms" className="underline">terms</Link> and <Link href="/refunds" className="underline">refund policy</Link>.
      </p>
    </LegalPage>
  );
}
