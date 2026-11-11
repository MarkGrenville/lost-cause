/**
 * Proves the money rules on the LOCAL Firebase emulators (never the cloud):
 *   npm run emulators          (in one terminal)
 *   npm run test:emulators     (in another)
 * Uses the real lib code. Makes no AI calls and no PayFast calls.
 */
import crypto from "node:crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) {
  throw new Error("Refusing to run: this only talks to the demo-* emulators.");
}

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  const sharp = (await import("sharp")).default;
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");
  const { db, bucket } = await import("../src/lib/firebase");
  const { userRef } = await import("../src/lib/auth");
  const S = await import("../src/lib/searches");
  const { runSearch } = await import("../src/lib/finder");
  const { createOrder, getOrder } = await import("../src/lib/orders");
  const { processItn, sourceIp } = await import("../src/lib/itn");
  const { pfEncode, payfast } = await import("../src/lib/payfast");
  const spend = await import("../src/lib/spend");
  const { findPack } = await import("../src/lib/packs");
  const { deleteExpiredPhotos } = await import("../../functions/cleanup.js");

  const credits = async (uid: string) => (await userRef(uid).get()).get("credits") as number;
  const newUser = async (n: number) => {
    const uid = `test-${crypto.randomBytes(4).toString("hex")}`;
    await userRef(uid).set({ email: `${uid}@example.com`, credits: n });
    return uid;
  };
  const today = db.collection("ai_spend").doc(new Date().toISOString().slice(0, 10));
  await today.delete();

  // A real JPEG carrying GPS EXIF (Cape Town), to prove it's stripped.
  const withGps = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#c96" } })
    .withExif({ IFD0: { Make: "TestCam" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "33/1 55/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "18/1 25/1 0/1" } })
    .jpeg()
    .toBuffer();
  const photo = () => new File([new Uint8Array(withGps)], "scene.jpg", { type: "image/jpeg" });

  console.log("\n— Credit spent once —");
  {
    const uid = await newUser(1);
    const before = (await bucket().getFiles({ prefix: "searches/" }))[0].length;
    const results = await Promise.all(Array.from({ length: 5 }, () => S.createSearch(uid, "my keys", [photo()])));
    const ok = results.filter((r) => r.ok);
    check("5 parallel searches with 1 credit: exactly 1 goes through", ok.length === 1, results.map((r) => (r.ok ? 201 : r.status)).join(","));
    check("the other 4 are refused with 402", results.filter((r) => !r.ok && r.status === 402).length === 4);
    check("credits 1 -> 0", (await credits(uid)) === 0);
    const searchId = (ok[0] as { searchId: string }).searchId;
    const added = (await bucket().getFiles({ prefix: "searches/" }))[0].length - before;
    check("the 4 refused uploads left no files behind", added === 1, `${added} file(s) added`);
    const own = (await db.collection("searches").where("user_id", "==", uid).get()).size;
    check("only 1 search document was created", own === 1);

    console.log("\n— Photos: EXIF/GPS stripped, private —");
    const inMeta = await sharp(withGps).metadata();
    check("the upload had EXIF (with GPS) going in", Boolean(inMeta.exif));
    const s = (await S.getSearch(searchId))!;
    const [stored] = await bucket().file(s.photos[0].path).download();
    const outMeta = await sharp(stored).metadata();
    check("the stored photo has no EXIF at all", !outMeta.exif, `in: ${inMeta.exif?.length ?? 0} bytes of EXIF, stored: ${outMeta.exif?.length ?? 0}`);
    check("no ICC/XMP/IPTC either", !outMeta.xmp && !outMeta.iptc);
    check("photos_expire_at is 7 days out", Math.abs((await S.searchRef(searchId).get()).get("photos_expire_at").toMillis() - Date.now() - 7 * 86_400_000) < 60_000);
  }

  {
    const uid = await newUser(3);
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(64)]);
    const r = await S.createSearch(uid, "my keys", [new File([new Uint8Array(heic)], "x.heic", { type: "image/heic" })]);
    check("HEIC is declined (we can't strip its GPS)", !r.ok && r.status === 415);
    check("…and takes no credit", (await credits(uid)) === 3);
  }

  console.log("\n— Per-user rate limit —");
  {
    const uid = await newUser(20);
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) {
      const r = await S.createSearch(uid, "my keys", [photo()]);
      codes.push(r.ok ? 201 : r.status);
    }
    check("10 searches in an hour go through, the 11th gets 429", codes.slice(0, 10).every((c) => c === 201) && codes[10] === 429, codes.join(","));
    check("the refused one takes no credit (20 -> 10)", (await credits(uid)) === 10);
  }

  console.log("\n— Daily AI spend cap —");
  {
    const uid = await newUser(2);
    await today.set({ usd: spend.dailyCapUsd(), calls: 0 });
    const r = await S.createSearch(uid, "my keys", [photo()]);
    check(`at the cap ($${spend.dailyCapUsd()}), a new search is paused with 503`, !r.ok && r.status === 503, !r.ok ? r.error : "");
    check("…and no credit is taken", (await credits(uid)) === 2);
    let threw = false;
    try {
      await spend.reserveCall("x", 1, "m");
    } catch (e) {
      threw = e instanceof spend.SpendCapReached;
    }
    check("a vision call can't be reserved at the cap", threw);

    // The cap is reached while a search is waiting to run: it fails and the credit comes back.
    await today.set({ usd: 0, calls: 0 });
    const ok = await S.createSearch(uid, "my keys", [photo()]);
    check("under the cap, a search is created (2 -> 1)", ok.ok && (await credits(uid)) === 1);
    await today.set({ usd: spend.dailyCapUsd(), calls: 0 });
    await runSearch((ok as { searchId: string }).searchId); // reserveCall refuses: no API call is made
    const after = (await S.getSearch((ok as { searchId: string }).searchId))!;
    check("cap hit mid-way: the search fails without calling the AI", after.status === "failed", after.error ?? "");
    check("…and its credit comes back (1 -> 2)", (await credits(uid)) === 2);
    await today.delete();
  }

  console.log("\n— A failed search gives the credit back, once —");
  {
    const uid = await newUser(1);
    const r = (await S.createSearch(uid, "my keys", [photo()])) as { searchId: string };
    await S.searchRef(r.searchId).update({ status: "searching", started_at: FieldValue.serverTimestamp() });
    const res = await Promise.all(Array.from({ length: 5 }, () => S.failAndRefund(r.searchId, "boom")));
    check("5 parallel refunds for one failed search: exactly 1 happens", res.filter(Boolean).length === 1);
    check("credits 0 -> 1, not more", (await credits(uid)) === 1);

    const r2 = (await S.createSearch(uid, "my keys", [photo()])) as { searchId: string };
    await S.searchRef(r2.searchId).update({ status: "searching", started_at: Timestamp.fromMillis(Date.now() - 4 * 60_000) });
    const stuck = (await S.getSearch(r2.searchId))!;
    const [a, b] = await Promise.all([S.failIfStuck(stuck), S.failIfStuck(stuck)]);
    check("a search stuck 'searching' for 4 min is failed", a && b && (await S.getSearch(r2.searchId))!.status === "failed");
    check("…and refunded once (0 -> 1)", (await credits(uid)) === 1);
  }

  console.log("\n— \"Nope\" gives the credit back, once —");
  {
    const uid = await newUser(1);
    const r = (await S.createSearch(uid, "my keys", [photo()])) as { searchId: string };
    await S.searchRef(r.searchId).update({ status: "done", result_json: "{}" });
    const res = await Promise.all(Array.from({ length: 5 }, () => S.setVerdict(uid, r.searchId, "nope")));
    check("5 parallel 'Nope's: exactly 1 succeeds", res.filter((x) => x.ok).length === 1, res.map((x) => (x.ok ? "ok" : x.status)).join(","));
    check("credits 0 -> 1, not more", (await credits(uid)) === 1);
    const again = await S.setVerdict(uid, r.searchId, "found");
    check("changing to 'Found it' afterwards is refused with 409", !again.ok && again.status === 409);
    const other = await newUser(0);
    const theirs = await S.setVerdict(other, r.searchId, "nope");
    check("someone else's search: 404", !theirs.ok && theirs.status === 404);
  }

  console.log("\n— ITN credited once —");
  {
    const uid = await newUser(0);
    const pack = findPack("sock-drawer")!;
    const signed = (fields: [string, string][]) => {
      const param = fields.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
      const withPass = payfast.passphrase ? `${param}&passphrase=${pfEncode(payfast.passphrase)}` : param;
      return `${param}&signature=${crypto.createHash("md5").update(withPass).digest("hex")}`;
    };
    const itn = (orderId: string, amount: string, over: Record<string, string> = {}) =>
      signed(Object.entries({
        m_payment_id: orderId, pf_payment_id: "1234567", payment_status: "COMPLETE", item_name: "Lost Cause: The Sock Drawer",
        amount_gross: amount, amount_fee: "-1.15", amount_net: "28.85", merchant_id: payfast.merchantId, ...over,
      }));
    const pass = { sourceValid: async () => true, serverConfirms: async () => true };

    const order = (await createOrder(uid, pack))!;
    check("an order is created pending at R30.00", order.status === "pending" && order.amount_cents === 3000);
    const outs = await Promise.all(Array.from({ length: 5 }, () => processItn(itn(order.id, "30.00"), "196.33.227.224", [], pass)));
    const outcomes = outs.map((o) => o.outcome);
    check("5 identical valid ITNs: exactly 1 credits", outcomes.filter((o) => o === "credited").length === 1, outcomes.join(","));
    check("…the rest say already-handled", outcomes.filter((o) => o === "already-handled").length === 4);
    check("credits 0 -> 3, not 15", (await credits(uid)) === 3);
    check("the order is paid, confirmed_via itn", (await getOrder(order.id))!.confirmed_via === "itn");

    const o2 = (await createOrder(uid, pack))!;
    const real = await processItn(itn(o2.id, "30.00"), "127.0.0.1", ["127.0.0.1"]); // the real IP check
    check("a perfectly signed ITN from localhost is rejected on source IP", real.outcome === "rejected" && !real.checks.ip && real.checks.signature);
    const forged = await processItn(itn(o2.id, "30.00").replace(/signature=\w+/, "signature=" + "0".repeat(32)), "1.1.1.1", [], pass);
    check("a forged signature is rejected", forged.outcome === "rejected" && !forged.checks.signature);
    const cheap = await processItn(itn(o2.id, "3.00"), "1.1.1.1", [], pass);
    check("the wrong amount (R3 for a R30 order) is rejected", cheap.outcome === "rejected" && !cheap.checks.amount);
    const merchant = await processItn(itn(o2.id, "30.00", { merchant_id: "999" }), "1.1.1.1", [], pass);
    check("someone else's merchant ID is rejected", merchant.outcome === "rejected" && !merchant.checks.merchant);
    const notValid = await processItn(itn(o2.id, "30.00"), "1.1.1.1", [], { sourceValid: async () => true, serverConfirms: async () => false });
    check("PayFast's server saying INVALID is rejected", notValid.outcome === "rejected" && !notValid.checks.server);
    check("after all that, the second order is still pending and credits are still 3", (await getOrder(o2.id))!.status === "pending" && (await credits(uid)) === 3);
    const logged = (await db.collection("itn_log").where("order_id", "==", o2.id).get()).size;
    check("every ITN was logged", logged === 5, `${logged} rows`);

    process.env.ITN_PROXY_HOPS = "2";
    const ip = sourceIp(new Headers({ "x-forwarded-for": "6.6.6.6, 196.33.227.224, 35.191.0.1" }));
    check("a forged X-Forwarded-For entry is ignored (2 proxy hops)", ip.ip === "196.33.227.224");
    delete process.env.ITN_PROXY_HOPS;
  }

  console.log("\n— Photos are deleted after 7 days —");
  {
    const uid = await newUser(2);
    const oldS = (await S.createSearch(uid, "old keys", [photo()])) as { searchId: string };
    const newS = (await S.createSearch(uid, "new keys", [photo()])) as { searchId: string };
    await S.searchRef(oldS.searchId).update({ photos_expire_at: Timestamp.fromMillis(Date.now() - 1000) });
    const n = await deleteExpiredPhotos(db, bucket());
    const [oldFiles] = await bucket().getFiles({ prefix: `searches/${oldS.searchId}/` });
    const [newFiles] = await bucket().getFiles({ prefix: `searches/${newS.searchId}/` });
    check("the expired search's photos are deleted", n >= 1 && oldFiles.length === 0, `${n} search(es) cleaned`);
    check("a fresh search's photos are kept", newFiles.length === 1);
    const old = (await S.getSearch(oldS.searchId))!;
    check("the expired search is marked photos_deleted, its text kept", old.photos_deleted && old.description === "old keys");
    check("running the cleanup again finds nothing", (await deleteExpiredPhotos(db, bucket())) === 0);
  }

  console.log(failures ? `\n${failures} FAILED` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
