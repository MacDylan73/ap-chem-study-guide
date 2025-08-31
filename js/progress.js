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

export async function updateUnitButtonProgress() {
  // Only run on index page
  if (!document.querySelector('.unit-btn')) return;

  let progressData = window.isSignedIn && window.currentUser
    ? await getProgress()
    : null;

  document.querySelectorAll('.unit-btn').forEach(btn => {
    const unitId = btn.dataset.unitId;
    const progressFill = btn.querySelector('.unit-progress-fill');
    const percentElem = btn.querySelector('.unit-percent');

    let percent = 0;
    if (progressData && progressData.units && progressData.units[unitId]) {
      const unit = progressData.units[unitId];
      const subunits = unit.subunits || {};
      const subunitsComplete = Object.values(subunits).filter(Boolean).length;
      const totalSubunits = Object.keys(subunits).length;
      const finalQuizComplete = unit.finalQuizCompleted ? 1 : 0;
      const percentRaw = ((subunitsComplete + finalQuizComplete) / (totalSubunits + 1)) * 100;
      percent = Math.round(percentRaw);
    }
    if (progressFill) progressFill.style.width = percent + '%';
    if (percentElem) percentElem.textContent = percent + '%';
  });
}

// Optionally, call this on DOMContentLoaded (if index page)
// Or, import and call from index.js
document.addEventListener('DOMContentLoaded', () => {
  updateUnitButtonProgress();
});
