import { getUsername, isUsernameTaken, saveUsername, getUser } from './auth.js';
import { getProgress } from './progress.js';
import { db } from './auth.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- Utility: Unit Names and Counts ---
const unitNames = {
  "unit-1": "Unit 1",
  "unit-2": "Unit 2",
  "unit-3": "Unit 3",
  "unit-4": "Unit 4",
  "unit-5": "Unit 5",
  "unit-6": "Unit 6",
  "unit-7": "Unit 7",
  "unit-8": "Unit 8",
  "unit-9": "Unit 9"
};
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

// --- Modal Logic ---
function showAccountModal() {
  const modal = document.getElementById('accountModal');
  if (modal) {
    modal.style.display = 'block';
    // Use custom event to trigger data reload
    modal.dispatchEvent(new Event('show'));
  }
}
function closeAccountModal() {
  const modal = document.getElementById('accountModal');
  if (modal) modal.style.display = 'none';
  resetUsernameEdit();
}

// --- Username Logic ---
async function loadUsername() {
  const usernameDisplay = document.getElementById('accountUsernameDisplay');
  if (!getUser()) {
    usernameDisplay.textContent = '[unknown]';
    return;
  }
  const username = await getUsername();
  usernameDisplay.textContent = username || '[unknown]';
  document.getElementById('accountUsernameInput').value = username || '';
}

// --- Username Edit Logic ---
function resetUsernameEdit() {
  document.getElementById('accountUsernameEditSection').style.display = 'none';
  document.getElementById('accountUsernameDisplay').style.display = '';
  document.getElementById('editUsernameBtn').style.display = '';
  document.getElementById('accountUsernameErrorMsg').textContent = '';
}

function setupUsernameEditLogic() {
  const usernameDisplay = document.getElementById('accountUsernameDisplay');
  const editBtn = document.getElementById('editUsernameBtn');
  const editSection = document.getElementById('accountUsernameEditSection');
  const usernameInput = document.getElementById('accountUsernameInput');
  const errorMsg = document.getElementById('accountUsernameErrorMsg');
  const saveBtn = document.getElementById('saveEditUsernameBtn');
  const cancelBtn = document.getElementById('cancelEditUsernameBtn');

  if (editBtn) {
    editBtn.onclick = () => {
      editSection.style.display = 'flex';
      usernameDisplay.style.display = 'none';
      editBtn.style.display = 'none';
      usernameInput.value = usernameDisplay.textContent;
      errorMsg.textContent = '';
      usernameInput.focus();
    };
  }
  if (cancelBtn) cancelBtn.onclick = resetUsernameEdit;

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const newUsername = usernameInput.value.trim();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
        errorMsg.textContent = "Username must be 3–20 characters, letters/numbers/underscores only.";
        return;
      }
      if (await isUsernameTaken(newUsername)) {
        errorMsg.textContent = "Username is already taken.";
        return;
      }
      try {
        await saveUsername(newUsername);
        await loadUsername();
        resetUsernameEdit();
      } catch (e) {
        errorMsg.textContent = e.message || "Error saving username.";
      }
    };
  }
}

// --- Progress Bars & Final Quiz ---
async function loadProgressBars() {
  const progressData = await getProgress();
  const container = document.getElementById('unitProgressList');
  if (!container) return;
  container.innerHTML = '';

  if (!progressData || !progressData.units) {
    container.innerHTML = '<div style="color:#666;">No progress data. Start learning!</div>';
    document.getElementById('finalQuizBestScore').textContent = "N/A";
    return;
  }

  let bestQuizScore = null;
  Object.keys(unitNames).forEach(unitId => {
    const unit = progressData.units[unitId] || {};
    const subunits = unit.subunits || {};
    const subunitsComplete = Object.values(subunits).filter(Boolean).length;
    const totalSubunits = totalSubunitsByUnit[unitId] || 0;
    const finalQuizComplete = unit.finalQuizCompleted ? 1 : 0;
    const percentRaw = ((subunitsComplete + finalQuizComplete) / (totalSubunits + 1)) * 100;
    const percent = Math.round(percentRaw);

    // Final quiz score
    if (typeof unit.finalQuizHighestScore === "number") {
      if (bestQuizScore === null || unit.finalQuizHighestScore > bestQuizScore) {
        bestQuizScore = unit.finalQuizHighestScore;
      }
    }

    container.innerHTML += `
      <div style="margin-bottom:10px;">
        <span style="display:inline-block;width:110px;">${unitNames[unitId]}:</span>
        <div style="display:inline-block;vertical-align:middle;width:150px;height:12px;background:#eee;border-radius:6px;overflow:hidden;">
          <div style="height:12px;background:#3949ab;width:${percent}%;"></div>
        </div>
        <span style="margin-left:8px;">${percent}%</span>
      </div>
    `;
  });

  // Final quiz score
  document.getElementById('finalQuizBestScore').textContent = bestQuizScore !== null ? bestQuizScore : "N/A";
}

// --- QOTD Stats (modular, not using old modal logic) ---
async function loadQotdStats() {
  const user = getUser();
  const qotdStatsBox = document.getElementById('qotdStatsBox');
  if (!qotdStatsBox) return;

  if (!user) {
    qotdStatsBox.innerHTML = '<div style="color:#666;">Sign in to view QOTD stats.</div>';
    return;
  }

  // Fetch all attempts for this user
  const attemptsRef = collection(db, "qotd_attempts");
  const q = query(attemptsRef, where("uid", "==", user.uid));
  const snap = await getDocs(q);
  const attempts = [];
  snap.forEach(doc => attempts.push(doc.data()));

  // Compute stats
  const totalAttempted = attempts.length;
  const totalCorrect = attempts.filter(a => a.correct).length;

  // Streak & Best streak calculation
  attempts.sort((a, b) => a.date.localeCompare(b.date));
  let currentStreak = 0, longestStreak = 0;
  let prevDate = null, streak = 0;
  for (let i = 0; i < attempts.length; ++i) {
    if (!attempts[i].correct) {
      streak = 0;
      continue;
    }
    const thisDate = attempts[i].date;
    if (prevDate) {
      const prev = new Date(prevDate);
      const curr = new Date(thisDate);
      const daysDiff = (curr - prev) / (1000*60*60*24);
      if (daysDiff === 1) streak++;
      else streak = 1;
    } else {
      streak = 1;
    }
    prevDate = thisDate;
    if (streak > longestStreak) longestStreak = streak;
  }
  // Compute current streak (last attempt date = today and correct)
  const todayStr = (() => {
    const easternNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    );
    const yyyy = easternNow.getFullYear();
    const mm = String(easternNow.getMonth() + 1).padStart(2, '0');
    const dd = String(easternNow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  if (
    attempts.length &&
    attempts[attempts.length-1].date === todayStr &&
    attempts[attempts.length-1].correct
  ) {
    currentStreak = streak;
  } else {
    currentStreak = 0;
  }

  qotdStatsBox.innerHTML = `
    <div>Attempted: ${totalAttempted}</div>
    <div>Correct: ${totalCorrect}</div>
    <div>Streak: ${currentStreak}</div>
    <div>Best Streak: ${longestStreak}</div>
  `;
}

// --- Badges (placeholder outlines) ---
function loadBadges() {
  // Outlines are already present in HTML; nothing needed yet.
}

// --- Main loader ---
async function loadAccountModalData() {
  await loadUsername();
  await loadProgressBars();
  await loadQotdStats();
  loadBadges();
}

// --- Attach event handlers on first modal open ---
function setupAccountModalEvents() {
  const modal = document.getElementById('accountModal');
  if (!modal) return;

  // Close logic
  const closeBtn = document.getElementById('closeAccountModal');
  if (closeBtn) closeBtn.onclick = closeAccountModal;
  modal.onclick = (e) => { if (e.target === modal) closeAccountModal(); };
  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'block' && e.key === 'Escape') closeAccountModal();
  });

  setupUsernameEditLogic();

  // Load (refresh) data each time modal is shown
  modal.addEventListener('show', loadAccountModalData);
}

// --- Initialize logic on DOM ready ---
document.addEventListener('DOMContentLoaded', () => {
  setupAccountModalEvents();
  if (document.getElementById('accountModal')) {
    setupAccountModalEvents();
  }
});

// --- If modal is shown via Account button, trigger data reload ---
window.showAccountModal = showAccountModal; // Expose for external use
