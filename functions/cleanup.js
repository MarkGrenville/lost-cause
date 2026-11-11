/**
 * Delete the photos of every search older than 7 days. Each search carries photos_expire_at
 * (set when it was created); once its files are gone the field is set to null and
 * photos_deleted_at is set, so the search drops out of this query for good.
 * The search's text and result stay, so the account still shows where the AI said to look.
 * (Plain Dates and null only, so this works with whichever Firestore SDK passes in `db`.)
 */
export async function deleteExpiredPhotos(db, bucket, now = new Date()) {
  let deleted = 0;
  for (;;) {
    const due = await db.collection("searches").where("photos_expire_at", "<=", now).limit(100).get();
    if (due.empty) return deleted;
    for (const doc of due.docs) {
      await bucket.deleteFiles({ prefix: `searches/${doc.id}/` });
      await doc.ref.update({ photos_expire_at: null, photos_deleted_at: new Date() });
      deleted++;
    }
  }
}
