import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { deleteExpiredPhotos } from "./cleanup.js";

initializeApp();

/** Every night at 03:00 (Johannesburg): photos older than 7 days are deleted. */
// europe-west4: Cloud Scheduler has no africa-south1 region.
export const deleteOldPhotos = onSchedule({ region: "europe-west4", schedule: "every day 03:00", timeZone: "Africa/Johannesburg", retryCount: 3 }, async () => {
  const n = await deleteExpiredPhotos(getFirestore(), getStorage().bucket());
  console.log(`Deleted the photos of ${n} search(es) older than 7 days.`);
});
