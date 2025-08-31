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

/**
 * Dynamically updates unit buttons on the index page to reflect progress and enables navigation.
 * - Fills progress bar with green according to percent completion.
 * - Injects percent completion text.
 * - Makes the button navigate to the correct unit page on click.
 */
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

    // Enable navigation on button click
    btn.onclick = () => {
      // You may want to use a mapping if your filenames differ!
      // For now, assumes pattern: unit-1 => unit-1-atomic-structure.html, etc.
      // You can change this logic if your filenames are different.
      let pageMap = {
        'unit-1': 'unit-1-atomic-structure.html',
        'unit-2': 'unit-2-molecular-structure.html',
        'unit-3': 'unit-3-intermolecular-forces-and-properties.html',
        'unit-4': 'unit-4-chemical-reactions.html',
        'unit-5': 'unit-5-kinetics.html',
        'unit-6': 'unit-6-thermodynamics.html',
        'unit-7': 'unit-7-equilibrium.html',
        'unit-8': 'unit-8-acids-and-bases.html',
        'unit-9': 'unit-9-applications-of-thermodynamics.html'
      };
      const url = pageMap[unitId] || `${unitId}.html`;
      window.location.href = url;
    };
  });
}

document.addEventListener("authstatechanged", () => {
  updateUnitButtonProgress();
});
