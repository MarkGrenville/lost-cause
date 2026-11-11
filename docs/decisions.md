# Lost Cause: the decisions, and why

Every real decision in this project, in the order it was made, with the reason that was given
at the time and what it replaced or cost. It is taken from the stage notes (`notes.md` for
stages 1–12), the project brief, the video plan, the commit history and comments in the code.
Where no reason was written down, it says so: **[no reason recorded]**, and anything that is
my reading rather than a record is marked **[inference]**.

Who decided: **Mark** (the person building this), **the brief** (Claude on Mark's main Mac,
writing the stage-by-stage plan from Mark's direction), or **the build agent** (Claude Code on
the studio Mac, doing the work). The video's point is that a person made these calls with AI
doing the typing, so each one says whose call it was.

---

## 1. The idea and the price

**Decision:** a joke-but-real website: upload photos of where you lost something, spend a
credit, and an AI marks where to look. Name "Lost Cause", line "We specialise in lost causes".
**Who:** Mark. **Source:** the brief, "Why you're here".
**Reason:** to show people, plainly, what building and selling a small project takes: "if I
can build this ridiculous thing, you can build something too".

**Decision:** R10 a find, sold in packs: 3 for R30, 10 for R100, 25 for R250.
**Who:** Mark (11 Nov). **Source:** the brief, stage 6; commit `8c7e9d8`.
**Replaced:** the stage 1 prices R49 / R129 / R249, which Mark had approved as final the night
before (stage 1 and 3 notes). **Reason:** a single, easy number to say in the video ("R10 a
find"). [The brief records the direction, not a longer reason.]

**Decision:** credits, not a subscription; one credit is one search of up to 5 photos.
**Who:** the brief. **Source:** stage 3 and 4 notes. **Reason:** [no reason recorded]. The
landing page has said "Not per month" since stage 6.

## 2. The stack

**Decision:** Next.js (App Router, TypeScript) with Tailwind, SQLite (better-sqlite3) for data,
and a local `uploads/` folder for photos.
**Who:** the brief, "Build rules". **Reason recorded:** "Use no outside accounts except
Anthropic and the PayFast sandbox": everything had to run on one laptop with no sign-ups.
**Cost:** it couldn't go live as it was; see 10.

**Decision:** Claude Code agents do the building on a second Mac, run from Nocturnal, and film
themselves with Capture Dashboard and OBS.
**Who:** Mark. **Source:** the brief, "Tools on this Mac"; the video plan, section 3.
**Reason:** the video shows the real process ("Honest about process: show the testing and
fixing"), so the work is filmed as it happens.

## 3. Sign-in, version 1: email codes

**Decision:** passwordless sign-in with a 6-digit email code; codes stored only as an HMAC,
10-minute expiry, 5 wrong guesses, 5 codes per 15 minutes.
**Who:** the build agent (stage 2). **Reason:** no passwords to store or leak [inference from
the design; the note records the mechanics, not a reason].
**Cost recorded:** there was no email provider (no outside accounts), so codes went to a
labelled **DEV mailbox** and production refused to issue codes at all (stage 2 notes).
Replaced in 11.

## 4. Payments: PayFast, and why the return URL isn't trusted

**Decision:** PayFast, in rand, sandbox first.
**Who:** the brief. **Reason recorded:** it's a South African gateway (README, stage 9); the
brief limits development to "PayFast sandbox only … never real payment details".

**Decision:** prices are read only on the server; the browser never sends a price.
**Who:** the build agent (stage 3). **Source:** `lib/packs.ts` header comment.
**Reason:** anyone can edit what a browser sends.

**Decision:** an order is paid **only** by PayFast's ITN (the server-to-server notice), after
four checks: the signature, that the request comes from one of PayFast's published hosts, the
amount matches the order, and PayFast's own server confirms the data. Each order is credited
exactly once.
**Who:** the build agent, following PayFast's documentation (stage 3 notes; `lib/itn.ts`).
**Why the return URL isn't trusted:** "A browser arriving here proves nothing: anyone can type
this URL" (comment in `app/checkout/return/route.ts`).
**Cost:** PayFast can't reach a laptop, and the brief forbids a public tunnel without Mark's
yes, so in development (sandbox only) the return URL confirms orders through a clearly labelled
**DEV-only** path. It never runs in production or in live mode.

**What went wrong (kept):** the first live test of the ITN on Firebase was rejected on the
source-IP check: App Hosting puts three proxies in front of the app, not the two I'd guessed.
Measured from that real sandbox ITN, then fixed (`7ee5adb`, stage 10 notes).

## 5. Uploading photos

**Decision:** uploads go through a route handler, not a Server Action.
**Who:** the build agent (stage 4). **Reason recorded:** "Server Actions cap request bodies at
1 MB and 5 × 10 MB needs more."

**Decision:** the file type is read from the bytes, not the name or the browser's label.
**Who:** the build agent (stage 4). **Reason:** names and labels can lie (`sniffImage` in
`lib/searches.ts`: "Trust the bytes").

**Decision:** taking the credit and creating the search happen in one transaction; if the
credit can't be taken, the stored files are deleted.
**Who:** the build agent (stage 4). **Reason:** a credit must be spent exactly once, and never
without a search. Proved under concurrency since stage 10 (5 parallel searches with 1 credit:
exactly 1 goes through).

## 6. How the AI looks: one overview plus four zoomed views

**Decision:** each photo is sent as 5 images: the whole photo shrunk to fit 1024 px, plus four
overlapping crops (each 60% × 60% of the photo, overlapping 20% in the middle) enlarged to
1024 px. One request per photo.
**Who:** the build agent (stage 5), under the brief's rule "Shrink images before sending".
**Reason:** small objects disappear when a whole photo is shrunk; "small objects are often only
clear in a zoomed tile" (the prompt in `lib/finder.ts`). Shrinking keeps each request small and
cheap. Re-encoding also means EXIF/GPS isn't sent (stage 5 notes).
**Cost:** about 5,700–6,500 input tokens per photo instead of one image's worth.

**Decision:** the model answers in strict JSON (each spot with a box, a confidence, a label and
a reason, plus "where to look next"), checked with zod.
**Who:** the build agent (stage 5). **Reason:** the app has to draw the boxes, so it needs
numbers, not prose.

**What went wrong (kept):** the first circles were drawn in the wrong place. The prompt asked
for a 0–1000 scale; the model answered in the sent image's own pixels. The agent proved it from
the numbers before spending more calls, then asked for pixel boxes and gave each tile's size
(stage 5 notes, "Coordinate scale bug").

## 7. Which model, and what a find costs

**Decision:** `claude-sonnet-5-5` by default, configurable with `LOST_CAUSE_MODEL`, effort
`high`.
**Who:** the brief ("claude-sonnet-5-5 by default, configurable"). **Reason:** [no reason
recorded beyond the brief's instruction].

**What it costs (measured, not estimated):** $0.014–0.019 per photo on real photos
(5,700–6,500 input and 290–790 output tokens at Sonnet 5.5's $2 / $10 per million tokens),
roughly R0.25–0.35 (stage 7 and 9 notes; the `ai_calls` ledger). Against R10 charged, the AI is
a small part of the price.
**Not measured:** PayFast's fee on a real R30 payment, and Firebase's running costs.
**[No figures recorded yet.]**

**Decision:** the AI key is read from `LOST_CAUSE_ANTHROPIC_API_KEY` and passed to the SDK
explicitly, never `ANTHROPIC_API_KEY`.
**Who:** the brief. **Reason recorded:** the standard name "would switch Claude Code itself to
API billing".

## 8. "No find, credit back"

**Decision:** after a search, "Found it" or "Nope"; "Nope" gives the credit back, once per
search.
**Who:** Mark / the brief (stage 6); the promise was on the landing page's FAQ since stage 1.
**Reason:** people pay more easily when a miss costs nothing [inference: the notes record the
promise, not the reasoning]. **Cost:** a user could take every credit back with "Nope". The
refund is once per search and in the same transaction as the verdict, so a double click or a
replay can't refund twice (stage 6 notes).

**Decision:** a search that fails on our side, or gets stuck for 3 minutes, gives the credit
back automatically.
**Who:** the brief (stage 10 safety list) and the build agent (the 3-minute stuck rule,
stage 10). **Reason:** the user didn't get what they paid for.

## 9. Real photos for the test

**Decision:** test with real, free-licence photos where a small item is genuinely in the
picture but easy to miss, with no identifiable people; keep sources and licences in
`test-photos/SOURCES.md`; film the whole flow at real speed and keep any miss.
**Who:** the brief (stage 7). **Reason:** "Real: a real photo through the real AI at real
speed" (video plan). The first tests (stage 4–5) used drawings, which prove less.

## 10. SQLite first, Firestore later

**Decision:** move to Firebase: App Hosting for the app, Firestore for data, Cloud Storage for
photos, the emulators for local development.
**Who:** Mark ("Real money", 11 Nov) and the brief (stage 10). Mark's Firebase account was
already set up on both Macs.
**Why SQLite had to go:** [inference] App Hosting runs the app in containers that start and
stop on demand and can run more than one at a time; a database file on one container's disk
would be lost or out of step. The notes record the move, not this reason.
**Cost:** every credit change had to be rewritten as a Firestore transaction, and proved again
on the emulators (44 checks).

**Decision:** Firestore and Storage in Johannesburg (africa-south1); App Hosting and the cleanup
function in europe-west4.
**Who:** the brief chose Johannesburg if offered; the build agent checked what each service
offers. **Reason recorded:** App Hosting offers no African region; Cloud Scheduler (which the
nightly cleanup needs) has none either (stage 10 notes).

**Decision:** secrets in Cloud Secret Manager, set from files with
`firebase apphosting:secrets:set`, never typed, printed or committed.
**Who:** the brief. **Reason:** keys on screen in a filmed project would leak.

## 11. Google sign-in replaces email codes

**Decision:** Firebase Auth with Google; the server swaps Google's token for its own httpOnly
session cookie.
**Who:** the brief (stage 10: "replaces the dev mailbox").
**Reason recorded:** the email-code sign-in could never work in production without an email
provider (stage 2 notes). **Cost:** someone needs a Google account to use the site.

**What went wrong (kept):** on the live site the sign-in origin check compared against the
container's own address (0.0.0.0:8080), which would have refused every real sign-in. Found by
testing the live return URL, fixed before anyone hit it (`3d2e309`, stage 10 notes).

## 12. The safety limits

Set in the brief for stage 10, before any real user. Built and proved on the emulators.

| Limit | Reason |
|---|---|
| EXIF and GPS removed from every photo before storing | Photos of someone's home can carry its exact location. |
| HEIC declined | It can't be decoded here, so its location data couldn't be removed (code comment, `lib/searches.ts`). Cost: iPhone users get a JPEG instead, which the browser usually does on its own. |
| Photos deleted after 7 days, nightly | Keep people's photos no longer than the search needs. The text and result stay. |
| Photos that are mainly of a person are declined | The service is for objects, not people. Decided by the AI in the same request, so it costs nothing extra. **Not yet tested against a real photo of a person.** |
| 10 searches per user per hour | Stop one account running up the AI bill [inference]. |
| A $5 daily AI budget, reserved before each call | A hard ceiling on AI spend. Reserved *before* the call so parallel searches can't overshoot (comment in `lib/spend.ts`). After it, searches pause and take no credit. |

## 13. The public repo: one fresh commit

**Decision:** the public GitHub repo starts from one fresh commit; the full history stays in a
private repo (`lost-cause-dev`).
**Who:** Mark ("with a fresh commit"). **Reason recorded:** the old history contained files
that shouldn't be public: the filming brief (with secret-file paths and studio set-up), the
agent guide and Nocturnal's project files. They were removed from the tree in stage 9 but stayed
readable in old commits (stage 9 notes). The secret scan found no keys in any commit.
**Cost:** the public repo doesn't show the stage-by-stage build.

## 14. The legal pages

**Decision:** Terms, Privacy, Refunds and Contact in plain words, in the name of Web Footprint
(info@webfootprint.co.za), under South African law and POPIA. Unused credits refunded on request
within 30 days.
**Who:** Mark (11 Nov). **Reason:** a site that takes money needs them, and PayFast merchants
are expected to have them [inference for the PayFast part].

## 15. The redesign: version 2

**Decision:** replace version 1's look ("a bit goofy") with "a little bit of a spy look": a
quiet investigator's desk, with images made with ChatGPT. Remove the "vs Mom" section and the
joke pack names; packs become "3 finds", "10 finds", "25 finds"; results read like a short
case report with a crosshair ring.
**Who:** Mark (his words), art direction in `briefs/lost-cause-art/spy-look.md`, images made
on his main Mac. **Reason recorded:** Mark didn't like the look, and wanted the change itself in
the video: "this was the first version, and we updated it to the next version".
**How (build agent):** the colours were changed at the token level. Version 1's colour names
now hold the new palette, so every page changed at once and no flow or check moved: "a
redesign, not a rebuild" (stage 11 notes). 44/44 emulator checks still pass.
**Cost:** version 1's character (the hand-drawn ring, the sticker shadows) is gone, on purpose.

## 16. Real payments

**Decision:** switch PayFast to live.
**Who:** Mark ("I want to make sure that you can take real payments on the real app"), after
version 2 was deployed and the sandbox ITN had passed on the public URL.
**How:** configuration only: the three PayFast secrets got their live values (version 2),
`PAYFAST_MODE` became `live`, no code changed (`f275def`). Checked without paying: PayFast's
live page accepted the signed form and showed "WebFootprint" and R30.00 (stage 12 notes).
**Mark's call, still to come:** he makes the first real purchase himself.

---

## Things the notes don't say

- Why credits and packs rather than paying per search.
- Why Sonnet 5.5 rather than another model (the brief chose it; no comparison was run).
- What a live payment costs in PayFast fees, and what Firebase costs per month.
- Whether people will pay R10 when a general chatbot can look at a photo too. The video plan
  says plainly that it may not: "a wrapper around one prompt is a nicer front door, not a
  business".
