// ---- AP Chem QOTD Logic with Firestore Attempt Tracking ----
// This file handles displaying the QOTD, gating based on sign-in, and saving/limiting attempts per user per day.
// Also powers the QOTD stats and leaderboard modals (for qotd-stats.html).

console.log("[QOTD] qotd.js loaded");

// ---- Only run gating logic after DOM is ready and auth state is known ----
let domReady = false;
let authReady = false;

// ---- Firebase Firestore setup ----
import { db, getUser } from './auth.js';
import {
  doc, setDoc, getDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Utility: get today's index for the question bank
function getQOTDIndex(numQuestions) {
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % numQuestions;
}

// Utility: today's date string for attempt records
function getTodayStrEastern() {
  // Get current date in Eastern Time
  const easternNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  // Format as YYYY-MM-DD
  const yyyy = easternNow.getFullYear();
  const mm = String(easternNow.getMonth() + 1).padStart(2, '0');
  const dd = String(easternNow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Utility: today's date/time
function getEasternTimeDate() {
  // Get current UTC time
  const now = new Date();
  // Get Eastern Time as a string
  const easternTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  // Parse back into a Date object
  return new Date(easternTimeString);
}

function getQOTDIndexEastern(numQuestions) {
  const easternToday = getTodayStrEastern();
  // Days since epoch in Eastern Time
  const easternDate = new Date(easternToday);
  const daysSinceEpoch = Math.floor(easternDate.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % numQuestions;
}

// Countdown for new QOTD
function startEasternCountdown() {
  const countdownDiv = document.getElementById('qotdCountdown');
  if (!countdownDiv) return;

  function updateCountdown() {
    // Get current Eastern Time
    const now = new Date();
    const easternTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const easternNow = new Date(easternTimeString);

    // Get next midnight in Eastern Time
    let nextMidnight = new Date(easternNow);
    nextMidnight.setHours(24, 0, 0, 0); // midnight next day

    // Calculate time difference in seconds
    const diffMs = nextMidnight - easternNow;
    const diffSec = Math.floor(diffMs / 1000);

    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    countdownDiv.textContent = `New Question of the Day in ${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  }

  updateCountdown();
  // Update every second
  let intervalId = setInterval(updateCountdown, 1000);

  // Optionally: return a function to stop the interval when needed
  return () => clearInterval(intervalId);
}

// ------------------ QOTD Display Logic (index page) -------------------

async function loadQOTD() {
  const res = await fetch('questions.json');
  const questions = await res.json();
  const idx = getQOTDIndexEastern(questions.length);
  const q = questions[idx];

  const container = document.getElementById('qotdQuestionContent');
  if (!container) return;

  // Render the question UI
  container.innerHTML = `
    <div class="question-box">
      <div class="question-text">${q.question}</div>
      <div class="answer-options">
        ${q.answers.map((ans, i) => `<button class="qotd-answer-btn" data-idx="${i}">${ans}</button>`).join('')}
      </div>
      <button id="qotdSubmitBtn" style="display:none;margin-top:12px;">Submit</button>
      <div class="qotd-feedback" style="display:none;margin-top:14px;"></div>
      <div id="qotdCountdown" style="margin-top:16px; font-size:1rem; color:gray;"></div>
    </div>
  `;

  // ------- Check for previous attempt ------
  await checkQOTDAttempt(q); // Will setup handlers, or show feedback if already answered
}

async function checkQOTDAttempt(q) {
  const today = getTodayStrEastern();
  const container = document.getElementById('qotdQuestionContent');
  const feedbackDiv = container.querySelector('.qotd-feedback');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');

  const lsKey = "qotd_attempt_" + today;
  const local = localStorage.getItem(lsKey);
  if (local) {
    const { answerIndex, correct } = JSON.parse(local);
    showQOTDFeedback(correct, q, answerIndex);
    disableQOTDButtons(answerBtns, submitBtn);
    return;
  }

  const user = getUser();
  if (!user) {
    setupQOTDHandlers(q);
    return;
  }
  const uid = user.uid;
  const docId = `${uid}_${today}`;
  const attemptRef = doc(db, "qotd_attempts", docId);
  try {
    const attemptSnap = await getDoc(attemptRef);
    if (attemptSnap.exists()) {
      const { answerIndex, correct } = attemptSnap.data();
      showQOTDFeedback(correct, q, answerIndex);
      disableQOTDButtons(answerBtns, submitBtn);
      localStorage.setItem(lsKey, JSON.stringify({ answerIndex, correct }));
      return;
    }
  } catch (err) {
    console.error("[QOTD] Error fetching Firestore attempt doc:", err);
  }

  setupQOTDHandlers(q);
}

function setupQOTDHandlers(q) {
  const container = document.getElementById('qotdQuestionContent');
  let selectedIdx = null;
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const feedbackDiv = container.querySelector('.qotd-feedback');

  answerBtns.forEach(btn => {
    btn.onclick = function() {
      selectedIdx = parseInt(btn.dataset.idx, 10);
      answerBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      submitBtn.style.display = 'inline-block';
      submitBtn.disabled = false;
      feedbackDiv.style.display = 'none';
      feedbackDiv.textContent = '';
      feedbackDiv.classList.remove('correct', 'incorrect');
    };
  });

  submitBtn.onclick = async function() {
    if (selectedIdx === null) return;
    submitBtn.disabled = true;
    answerBtns.forEach(b => b.disabled = true);

    const correct = (selectedIdx === q.correct);

    showQOTDFeedback(correct, q, selectedIdx);

    const today = getTodayStrEastern();
    const lsKey = "qotd_attempt_" + today;
    localStorage.setItem(lsKey, JSON.stringify({ answerIndex: selectedIdx, correct }));

    const user = getUser();
    if (user) {
      const uid = user.uid;
      const docId = `${uid}_${today}`;
      const attemptRef = doc(db, "qotd_attempts", docId);
      try {
        await setDoc(attemptRef, {
          uid,
          date: today,
          questionIndex: getQOTDIndex(q.answers.length),
          answerIndex: selectedIdx,
          correct
        });
        renderUserStreakAlways();
      } catch (err) {
        console.error("[QOTD] Error saving Firestore attempt doc:", err);
      }
    }
  };
}

function showQOTDFeedback(correct, q, selectedIdx) {
  const container = document.getElementById('qotdQuestionContent');
  const feedbackDiv = container.querySelector('.qotd-feedback');
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');

  answerBtns.forEach((b, i) => {
    b.disabled = true;
    b.classList.toggle('selected', i === selectedIdx);
  });
  submitBtn.disabled = true;
  submitBtn.style.display = 'none';

  feedbackDiv.style.display = 'block';
  if (correct) {
    feedbackDiv.textContent = "Correct!";
    feedbackDiv.classList.add('correct');
    feedbackDiv.classList.remove('incorrect');
    showConfetti();
  } else {
    feedbackDiv.textContent = "Incorrect! The correct answer was: " + q.answers[q.correct];
    feedbackDiv.classList.add('incorrect');
    feedbackDiv.classList.remove('correct');
  }

  // Show countdown for next QOTD
  startEasternCountdown();
}

function disableQOTDButtons(answerBtns, submitBtn) {
  answerBtns.forEach(b => b.disabled = true);
  submitBtn.disabled = true;
  submitBtn.style.display = 'none';
}

// ---- Gating logic for blur/overlay ----
function updateQOTDGating() {
  const blurOverlay = document.getElementById('qotdBlurOverlay');
  const questionContent = document.getElementById('qotdQuestionContent');
  const signedIn = window.isSignedIn;
  console.log("[QOTD] updateQOTDGating, window.isSignedIn:", signedIn);

  if (!blurOverlay || !questionContent) return;

  if (signedIn) {
    blurOverlay.style.display = 'none';
    questionContent.classList.remove('blurred');
  } else {
    blurOverlay.style.display = 'flex';
    questionContent.classList.add('blurred');
  }
}

function showAppSignInModal() {
  const signInModal = document.getElementById("signInModal");
  const tabSignIn = document.getElementById("tabSignIn");
  if (signInModal) {
    signInModal.style.display = "block";
    if (tabSignIn) tabSignIn.onclick();
    return true;
  }
  alert("Sign-in modal could not be triggered. Please check your modal integration.");
  return false;
}

// ---- Always-on streak display and tooltip logic ----
async function renderUserStreakAlways() {
  const qotdStreak = document.getElementById('qotdStreak');
  const streakTooltip = document.getElementById('streakTooltip');
  if (!qotdStreak || !streakTooltip) return;

  const user = getUser();
  if (!user) {
    qotdStreak.innerHTML = `<span class="streak-number">0</span> <span class="fire-icon">🔥</span>`;
    return;
  }

  // Fetch all attempts for this user
  const attemptsRef = collection(db, "qotd_attempts");
  const q = query(attemptsRef, where("uid", "==", user.uid));
  try {
    const snap = await getDocs(q);
    const attempts = [];
    snap.forEach(doc => attempts.push(doc.data()));
    attempts.sort((a, b) => a.date.localeCompare(b.date));

    // Streak calculations
    let streak = 0, prevDate = null;
    let currentStreak = 0;
    let yesterdayStreak = 0;
    const todayStr = getTodayStrEastern();
    const yesterdayStr = (() => {
      const now = new Date();
      // Eastern time string for yesterday
      now.setDate(now.getDate() - 1);
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();

    for (let i = 0; i < attempts.length; ++i) {
      if (!attempts[i].correct) {
        streak = 0;
        prevDate = attempts[i].date;
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
      // If we're at yesterday, store the streak
      if (thisDate === yesterdayStr) {
        yesterdayStreak = streak;
      }
    }

    // If answered today's correctly, use streak; otherwise, show streak up to yesterday
    if (
      attempts.length &&
      attempts[attempts.length - 1].date === todayStr &&
      attempts[attempts.length - 1].correct
    ) {
      currentStreak = streak;
    } else {
      currentStreak = yesterdayStreak;
    }

    qotdStreak.innerHTML = `<span class="streak-number">${currentStreak}</span> <span class="fire-icon" tabindex="0" style="cursor:pointer;">🔥</span>`;
    const fireIcon = qotdStreak.querySelector('.fire-icon');
    if (fireIcon) {
      // Tooltip logic
      function showStreakTooltip(e) {
        streakTooltip.textContent = `Current Streak: ${currentStreak}`;
        streakTooltip.style.display = 'block';
        streakTooltip.style.opacity = '1';
        setTimeout(() => {
          const rect = fireIcon.getBoundingClientRect();
          let parent = fireIcon.closest('.qotd-actions');
          if (!parent) parent = qotdStreak.parentElement;
          const parentRect = parent.getBoundingClientRect();
          streakTooltip.style.left = `${rect.left - parentRect.left + rect.width / 2 - streakTooltip.offsetWidth / 2}px`;
          streakTooltip.style.top = `${rect.top - parentRect.top - streakTooltip.offsetHeight - 10}px`;
        }, 1);
      }
      function hideStreakTooltip() {
        streakTooltip.style.display = 'none';
        streakTooltip.style.opacity = '0';
      }
      fireIcon.addEventListener('mouseenter', showStreakTooltip);
      fireIcon.addEventListener('mouseleave', hideStreakTooltip);
      fireIcon.addEventListener('focus', showStreakTooltip);
      fireIcon.addEventListener('blur', hideStreakTooltip);
      fireIcon.addEventListener('click', function (e) {
        showStreakTooltip(e);
        setTimeout(hideStreakTooltip, 1200);
      });
      fireIcon.addEventListener('touchstart', function (e) {
        showStreakTooltip(e);
        setTimeout(hideStreakTooltip, 1200);
      });
    }
  } catch (err) {
    qotdStreak.innerHTML = `<span class="streak-number">0</span> <span class="fire-icon">🔥</span>`;
  }
}

// ---- DOM and Auth listeners ----
document.addEventListener('DOMContentLoaded', () => {
  domReady = true;
  console.log("[QOTD] DOMContentLoaded");

  // Setup sign-in button
  const qotdSignInBtn = document.getElementById('qotdSignInBtn');
  if (qotdSignInBtn) {
    qotdSignInBtn.onclick = function() {
      showAppSignInModal();
    };
  }

  // Import modals if modal container exists
  if (document.getElementById('qotdModalContainer')) {
    importQOTDModals();
  }

  // If auth is already ready, run gating, load QOTD, and show streak
  if (authReady) {
    updateQOTDGating();
    loadQOTD();
    renderUserStreakAlways();
  }
});

function clearLocalQOTDAttempt() {
  const today = getTodayStrEastern();
  localStorage.removeItem("qotd_attempt_" + today);
}

document.addEventListener('authstatechanged', function(e) {
  window.isSignedIn = !!(e.detail && e.detail.user);
  authReady = true;
  clearLocalQOTDAttempt();
  console.log("[QOTD] authstatechanged event, isSignedIn:", window.isSignedIn);

  // Only run gating, load QOTD, and show streak when DOM is ready
  if (domReady) {
    updateQOTDGating();
    loadQOTD();
    renderUserStreakAlways();
  }
});

document.addEventListener('user-signed-in', function() {
  window.isSignedIn = true;
  authReady = true;
  clearLocalQOTDAttempt();
  if (domReady) {
    updateQOTDGating();
    renderUserStreakAlways();
  }
});

// Robust tooltip logic for streak fire icon (used in modals)
function attachStreakTooltip(qotdStreak, streakTooltip, currentStreak) {
  if (!qotdStreak || !streakTooltip) return;

  if (currentStreak > 0) {
    qotdStreak.innerHTML = `${currentStreak} <span class="fire-icon" tabindex="0" style="cursor:pointer;">🔥</span>`;
  } else {
    qotdStreak.innerHTML = `0 <span class="fire-icon">🔥</span>`;
  }
  const fireIcon = qotdStreak.querySelector('.fire-icon');
  if (!fireIcon) return;

  // Ensure modal-content is relative
  const modal = fireIcon.closest('.modal-content');
  if (modal && getComputedStyle(modal).position === 'static') {
    modal.style.position = 'relative';
  }

  function showStreakTooltip(e) {
    streakTooltip.textContent = `Current Streak: ${currentStreak}`;
    streakTooltip.style.display = 'block';
    streakTooltip.style.opacity = '1';
    setTimeout(() => {
      const rect = fireIcon.getBoundingClientRect();
      const modalRect = modal ? modal.getBoundingClientRect() : { left: 0, top: 0 };
      streakTooltip.style.left = `${rect.left - modalRect.left + rect.width/2 - streakTooltip.offsetWidth/2}px`;
      streakTooltip.style.top = `${rect.top - modalRect.top - streakTooltip.offsetHeight - 12}px`;
    }, 1);
  }
  function hideStreakTooltip() {
    streakTooltip.style.display = 'none';
    streakTooltip.style.opacity = '0';
  }
  fireIcon.addEventListener('mouseenter', showStreakTooltip);
  fireIcon.addEventListener('mouseleave', hideStreakTooltip);
  fireIcon.addEventListener('focus', showStreakTooltip);
  fireIcon.addEventListener('blur', hideStreakTooltip);
  fireIcon.addEventListener('click', function(e) {
    showStreakTooltip(e);
    setTimeout(hideStreakTooltip, 1200);
  });
  fireIcon.addEventListener('touchstart', function(e) {
    showStreakTooltip(e);
    setTimeout(hideStreakTooltip, 1200);
  });
}

// Loads and populates user stats modal
async function loadUserStatsModal() {
  const statsUserInfo = document.getElementById('statsUserInfo');
  const statsTotalAttempted = document.getElementById('statsTotalAttempted');
  const statsTotalCorrect = document.getElementById('statsTotalCorrect');
  const statsCurrentStreak = document.getElementById('statsCurrentStreak');
  const statsLongestStreak = document.getElementById('statsLongestStreak');
  const statsErrorMsg = document.getElementById('statsErrorMsg');
  // *** USE MODAL IDs HERE ***
  const qotdStreak = document.getElementById('modalQotdStreak');
  const streakTooltip = document.getElementById('modalStreakTooltip');

  // Clear previous
  statsErrorMsg.style.display = "none";
  statsUserInfo.textContent = "";
  statsTotalAttempted.textContent = "...";
  statsTotalCorrect.textContent = "...";
  statsCurrentStreak.textContent = "...";
  statsLongestStreak.textContent = "...";
  if (streakTooltip) streakTooltip.style.display = 'none';

  const user = getUser();
  if (!user) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "You must be signed in to view your stats.";
    if (qotdStreak) qotdStreak.textContent = "🔥";
    return;
  }

  // Show username/email if available
  statsUserInfo.textContent = user.displayName
    ? `Username: ${user.displayName}`
    : `User: ${user.email}`;

  // Fetch all attempts for this user
  const attemptsRef = collection(db, "qotd_attempts");
  const q = query(attemptsRef, where("uid", "==", user.uid));
  try {
    const snap = await getDocs(q);
    const attempts = [];
    snap.forEach(doc => attempts.push(doc.data()));

    // Compute stats
    const totalAttempted = attempts.length;
    const totalCorrect = attempts.filter(a => a.correct).length;

    // Sort attempts by date ascending
    attempts.sort((a, b) => a.date.localeCompare(b.date));

    // Streak calculations
    let currentStreak = 0, longestStreak = 0;
    let prevDate = null;
    let streak = 0;
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
        if (daysDiff === 1) streak++; // consecutive day
        else streak = 1;
      } else {
        streak = 1;
      }
      prevDate = thisDate;
      if (streak > longestStreak) longestStreak = streak;
    }
    // Compute current streak (last attempt date = today and correct)
    if (attempts.length && attempts[attempts.length-1].date === getTodayStrEastern() && attempts[attempts.length-1].correct) {
      currentStreak = streak;
    } else {
      currentStreak = 0;
    }

    statsTotalAttempted.textContent = totalAttempted;
    statsTotalCorrect.textContent = totalCorrect;
    statsCurrentStreak.textContent = currentStreak;
    statsLongestStreak.textContent = longestStreak;

    // ---- Inject streak number and fire icon, with robust tooltip logic ----
    attachStreakTooltip(qotdStreak, streakTooltip, currentStreak);

  } catch (err) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "Error loading stats: " + err.message;
    if (qotdStreak) qotdStreak.innerHTML = "🔥";
  }
}

// Loads and populates leaderboard modal
async function loadLeaderboardModal() {
  const leaderboardList = document.getElementById('leaderboardList');
  const leaderboardErrorMsg = document.getElementById('leaderboardErrorMsg');
  const leaderboardLoadingMsg = document.getElementById('leaderboardLoadingMsg');

  leaderboardErrorMsg.style.display = "none";
  leaderboardLoadingMsg.style.display = "block";
  leaderboardList.innerHTML = "";

  try {
    // Fetch all attempts
    const attemptsRef = collection(db, "qotd_attempts");
    const snap = await getDocs(attemptsRef);

    // Aggregate correct counts by user
    const userStats = {}; // uid -> { correct: int, attempted: int }
    snap.forEach(doc => {
      const d = doc.data();
      if (!userStats[d.uid]) userStats[d.uid] = { correct: 0, attempted: 0, username: null };
      userStats[d.uid].attempted++;
      if (d.correct) userStats[d.uid].correct++;
    });

    // Fetch usernames for leaderboard display
    const userEntries = Object.entries(userStats);
    // Sort by correct desc, attempted desc
    userEntries.sort((a, b) => b[1].correct - a[1].correct || b[1].attempted - a[1].attempted);

    // Try to get usernames from "users" collection
    for (let i = 0; i < userEntries.length; ++i) {
      const uid = userEntries[i][0];
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) userEntries[i][1].username = userDoc.data().username || uid;
        else userEntries[i][1].username = uid;
      } catch {
        userEntries[i][1].username = uid;
      }
    }

    // Render top 10 leaderboard
    leaderboardList.innerHTML = "";
    userEntries.slice(0, 10).forEach(([uid, data], idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span><b>#${idx+1}</b> ${data.username}</span>
        <span>${data.correct} correct / ${data.attempted} attempted</span>
      `;
      leaderboardList.appendChild(li);
    });

    leaderboardLoadingMsg.style.display = "none";
  } catch (err) {
    leaderboardLoadingMsg.style.display = "none";
    leaderboardErrorMsg.style.display = "block";
    leaderboardErrorMsg.textContent = "Please sign in to view the leaderboard";
  }
}

// ---- Modular modal import logic for QOTD Stats & Leaderboard ----
// This allows you to keep modal HTML in qotd-stats.html and inject it into index.html dynamically.

async function importQOTDModals() {
  // Fetch modal HTML from qotd-stats.html
  const res = await fetch('qotd-stats.html');
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const modalContainer = document.getElementById('qotdModalContainer');
  if (!modalContainer) return;

  // Extract modals by their IDs
  const statsModal = doc.getElementById('userStatsModal');
  const leaderboardModal = doc.getElementById('leaderboardModal');
  if (statsModal) modalContainer.appendChild(statsModal);
  if (leaderboardModal) modalContainer.appendChild(leaderboardModal);

  // Attach event handlers to buttons
  const statsBtn = document.getElementById('qotdStatsBtn');
  const leaderboardBtn = document.getElementById('qotdLeaderboardBtn');
  if (statsBtn && statsModal) {
    statsBtn.onclick = () => {
      statsModal.style.display = 'flex';
      loadUserStatsModal();
      showConfetti(); // TEMPORARY TEMPORARY TEMPORARY
    };
  }
  if (leaderboardBtn && leaderboardModal) {
    leaderboardBtn.onclick = () => {
      leaderboardModal.style.display = 'flex';
      loadLeaderboardModal();
    };
  }

  // Attach modal close & ESC logic
  const closeStatsBtn = document.getElementById('closeStatsModalBtn');
  const closeLeaderboardBtn = document.getElementById('closeLeaderboardModalBtn');
  if (closeStatsBtn && statsModal) closeStatsBtn.onclick = () => statsModal.style.display = 'none';
  if (closeLeaderboardBtn && leaderboardModal) closeLeaderboardBtn.onclick = () => leaderboardModal.style.display = 'none';
  if (statsModal) statsModal.onclick = (e) => { if (e.target === statsModal) statsModal.style.display = 'none'; };
  if (leaderboardModal) leaderboardModal.onclick = (e) => { if (e.target === leaderboardModal) leaderboardModal.style.display = 'none'; };
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
      if (statsModal && statsModal.style.display === 'flex') statsModal.style.display = 'none';
      if (leaderboardModal && leaderboardModal.style.display === 'flex') leaderboardModal.style.display = 'none';
    }
  });
}

// --- Automatically refresh QOTD at midnight (local time) ---
function scheduleMidnightQOTDRefresh() {
  const now = new Date();
  // Calculate milliseconds until next midnight + 1 second
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1) - now;
  setTimeout(() => {
    loadQOTD();           // refresh the question
    renderUserStreakAlways(); // update streak display
    scheduleMidnightQOTDRefresh(); // schedule for next midnight
  }, msUntilMidnight);
}

// Start midnight refresh when DOM and auth are ready
if (domReady && authReady) {
  scheduleMidnightQOTDRefresh();
}

// Confetti Overlay on Correct Answer
function showConfetti() {
  const overlay = document.getElementById('confettiOverlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    const startLeft = Math.random() * 100; // Start position in vw
    const endLeft = startLeft + (Math.random() * 20 - 10); // Move left or right up to ±10vw

    particle.style.position = 'absolute';
    particle.style.left = startLeft + 'vw';
    particle.style.top = '-20px';
    particle.style.width = '10px';
    particle.style.height = '18px';
    particle.style.background = `hsl(${Math.random()*360},80%,60%)`;
    particle.style.opacity = 0.7;
    particle.style.borderRadius = '3px';
    particle.style.transform = `rotate(${Math.random()*360}deg)`;
    const duration = 1.7 + Math.random() * (3.5 - 1.7);
    // Animate both top and left
    particle.style.transition = `top ${duration}s cubic-bezier(.2,.7,.3,1), left ${duration}s cubic-bezier(.2,.7,.3,1)`;
    overlay.appendChild(particle);

    setTimeout(() => {
      particle.style.top = '105vh';
      particle.style.left = endLeft + 'vw';
    }, 30);
  }

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }, 3500);
}

// ---- End of AP Chem QOTD logic ----
