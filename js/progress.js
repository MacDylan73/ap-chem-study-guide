import { db, getUser } from './auth.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/**
 * Get the current user's progress document from Firestore.
 */
export async function getProgress() {
  const user = getUser();
  if (!user) return null;
  const ref = doc(db, "progress", user.uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}

/**
 * Mark a subunit as completed for the current user.
 */
export async function setSubunitComplete(unitId, subunitId) {
  const user = getUser();
  if (!user) return;
  const ref = doc(db, "progress", user.uid);
  // Use setDoc with { merge: true } to create or update document safely
  await setDoc(ref, {
    units: {
      [unitId]: {
        subunits: {
          [subunitId]: true
        }
      }
    }
  }, { merge: true });
}

/**
 * Mark final quiz completed and update highest score percent if it's higher.
 */
export async function setFinalQuizComplete(unitId, percent) {
  const user = getUser();
  if (!user) return;
  const ref = doc(db, "progress", user.uid);
  const snap = await getDoc(ref);
  let prevScore = 0;
  if (snap.exists() && snap.data().units && snap.data().units[unitId]?.finalQuizHighestScore) {
    prevScore = snap.data().units[unitId].finalQuizHighestScore;
  }
  await setDoc(ref, {
    units: {
      [unitId]: {
        // Only mark completed if percent >= 80
        finalQuizCompleted: percent >= 80,
        finalQuizHighestScore: Math.max(percent, prevScore)
      }
    }
  }, { merge: true });
}
