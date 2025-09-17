import { db, getUser } from './auth.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/**
 * Master subunit counts per unit.
 * Keys must match data-unit-id attributes in index.html.
 */
const totalSubunitsByUnit = {
  "unit-1": 8,
  "unit-2": 7,
  "unit-3": 13,
  "unit-4": 9,
  "unit-5": 11,
  "unit-6": 9,
  "unit-7": 12,
  "unit-8": 11,
  "unit-9": 11
};

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

    // Always use the canonical subunit count for denominator
    const totalSubunits = totalSubunitsByUnit[unitId] || 0;

    let percent = 0;
    if (progressData && progressData.units && progressData.units[unitId]) {
      const unit = progressData.units[unitId];
      const subunits = unit.subunits || {};
      // Only count completed subunits (true values)
      const subunitsComplete = Object.values(subunits).filter(Boolean).length;
      const finalQuizComplete = unit.finalQuizCompleted ? 1 : 0;
      // Denominator is total subunits + 1 (for the final quiz)
      const percentRaw = ((subunitsComplete + finalQuizComplete) / (totalSubunits + 1)) * 100;
      percent = Math.round(percentRaw);
    }
    if (progressFill) progressFill.style.width = percent + '%';
    if (percentElem) percentElem.textContent = percent + '%';

    // Enable navigation on button click
    btn.onclick = () => {
      let pageMap = {
        'unit-1': 'ap-chem-unit-1-atomic-structure.html',
        'unit-2': 'ap-chem-unit-2-compound-structure-and-properties.html',
        'unit-3': 'ap-chem-unit-3-properties-of-substances-and-mixtures.html',
        'unit-4': 'ap-chem-unit-4-chemical-reactions.html',
        'unit-5': 'ap-chem-unit-5-kinetics.html',
        'unit-6': 'ap-chem-unit-6-thermochemistry.html',
        'unit-7': 'ap-chem-unit-7-equilibrium.html',
        'unit-8': 'ap-chem-unit-8-acids-and-bases.html',
        'unit-9': 'ap-chem-unit-9-thermodynamics-and-electrochemistry.html'
      };
      const url = pageMap[unitId] || `${unitId}.html`;
      window.location.href = url;
    };
  });
}

// Listen for auth state change and update progress bars
document.addEventListener("authstatechanged", () => {
  updateUnitButtonProgress();
});
window.addEventListener('pageshow', function(event) {
  updateUnitButtonProgress();
});
