// ---- AP Chem QOTD Logic with Firestore Attempt Tracking ----
// This file handles displaying the QOTD, gating based on sign-in, and saving/limiting attempts per user per day.
// Also powers the QOTD stats and leaderboard modals (for qotd-stats.html).

console.log("[QOTD] qotd.js loaded");

// ---- Only run gating logic after DOM is ready and auth state is known ----
let domReady = false;
let authReady = false;

// ---- Firebase Firestore setup ----
import { db, getUser } from './auth.js';
import { loadLeaderboard } from './leaderboard.js';
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
  const easternDate = new Date(easternToday);
  
  // QOTD season starts September 22, 2025 at midnight Eastern Time
  const seasonStartDate = new Date('2025-09-22');
  
  // Check if before season start
  if (easternDate < seasonStartDate) {
    return null;
  }
  
  // Calculate days since season start
  const daysSinceStart = Math.floor((easternDate.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check if after all questions are shown
  if (daysSinceStart >= numQuestions) {
    return 'ended';
  }
  
  return daysSinceStart;
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

export async function loadQOTD() {
  let questions;
  try {
    const res = await fetch('questions.json');
    questions = await res.json();
  } catch (e) {
    console.error("[QOTD] Error loading questions.json:", e);
    return;
  }
  if (!Array.isArray(questions) || !questions.length) {
    console.error("[QOTD] No questions found");
    return;
  }

  const idx = getQOTDIndexEastern(questions.length);
  
  const container = document.getElementById('qotdQuestionContent');
  if (!container) return;

  // Handle season start and end cases
  if (idx === null) {
    // Before season start
    container.innerHTML = `
      <div class="question-box">
        <div class="question-text" style="text-align: center; font-size: 1.1em; color: #666;">
          AP Chemistry Question of the Day season begins on September 22, 2025! Check back then for daily practice questions.
        </div>
      </div>
    `;
    return;
  }
  
  if (idx === 'ended') {
    // After all questions shown
    container.innerHTML = `
      <div class="question-box">
        <div class="question-text" style="text-align: center; font-size: 1.1em; color: #666;">
          AP Chemistry Question of the Day season has ended! Check back next year for more questions.
        </div>
      </div>
    `;
    return;
  }

  // Normal case - show the question
  const q = questions[idx];
  const isQotdPage = window.location.pathname.includes("ap-chem-question-of-the-day");

  container.innerHTML = `
    <div class="question-box">
      <div class="question-text">${q.question}</div>
      <div class="answer-options">
        ${q.answers.map((ans, i) => `<button class="qotd-answer-btn" data-idx="${i}">${ans}</button>`).join('')}
      </div>
      ${isQotdPage ? `<button id="qotdSubmitBtn" style="display:none;margin-top:12px;">Submit</button>` : ""}
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
  if (!container) return; // Guard container

  const feedbackDiv = container.querySelector('.qotd-feedback');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');

  // Guard child elements for feedback/answer/submit
  if (!feedbackDiv || !answerBtns || answerBtns.length === 0) {
    // It's possible to proceed to setup handlers if user isn't logged in
    // but no feedback/answer buttons means nothing to show or disable
    setupQOTDHandlers(q);
    return;
  }

  const lsKey = "qotd_attempt_" + today;
  const local = localStorage.getItem(lsKey);
  if (local) {
    let parsed;
    try {
      parsed = JSON.parse(local);
    } catch (e) {
      parsed = null;
    }
    if (parsed && typeof parsed.answerIndex === "number" && typeof parsed.correct === "boolean") {
      showQOTDFeedback(parsed.correct, q, parsed.answerIndex);
      disableQOTDButtons(answerBtns, submitBtn);
      return;
    }
    // If local storage is corrupted, clear it and proceed.
    localStorage.removeItem(lsKey);
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
  if (!container) return; // Guard container

  let selectedIdx = null;
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const feedbackDiv = container.querySelector('.qotd-feedback');

  // Guard all required elements
  if (!answerBtns || answerBtns.length === 0 || !submitBtn || !feedbackDiv) return;

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

    if (correct) {
      showConfetti();
    }

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
        updateStatsBox();
        loadLeaderboard("total", db);
      } catch (err) {
        console.error("[QOTD] Error saving Firestore attempt doc:", err);
      }
    }
  };
}

function showQOTDFeedback(correct, q, selectedIdx) {
  const container = document.getElementById('qotdQuestionContent');
  if (!container) return; // Guard container

  const feedbackDiv = container.querySelector('.qotd-feedback');
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');

  // Guard all required elements
  if (!feedbackDiv || !answerBtns || answerBtns.length === 0 || !submitBtn) return;

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
  } else {
    feedbackDiv.textContent = "Incorrect! The correct answer was: " + q.answers[q.correct];
    feedbackDiv.classList.add('incorrect');
    feedbackDiv.classList.remove('correct');
  }

  startEasternCountdown();
}

function disableQOTDButtons(answerBtns, submitBtn) {
  if (!answerBtns || answerBtns.length === 0 || !submitBtn) return;
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

  // Guard DOM elements
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
  // Extra guard: only show alert if document.body exists
  if (document.body) {
    alert("Sign-in modal could not be triggered. Please check your modal integration.");
  }
  return false;
}

// ---- Always-on streak display and tooltip logic ----
export async function renderUserStreakAlways() {
  const qotdStreak = document.getElementById('qotdStreak');
  const streakTooltip = document.getElementById('streakTooltip');
  // Guard DOM elements
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
        if (!streakTooltip) return;
        streakTooltip.textContent = `Current Streak: ${currentStreak}`;
        streakTooltip.style.display = 'block';
        streakTooltip.style.opacity = '1';
        setTimeout(() => {
          if (!fireIcon || !streakTooltip) return;
          const rect = fireIcon.getBoundingClientRect();
          let parent = fireIcon.closest('.qotd-actions');
          if (!parent) parent = qotdStreak.parentElement;
          if (!parent) return;
          const parentRect = parent.getBoundingClientRect();
          streakTooltip.style.left = `${rect.left - parentRect.left + rect.width / 2 - streakTooltip.offsetWidth / 2}px`;
          streakTooltip.style.top = `${rect.top - parentRect.top - streakTooltip.offsetHeight - 10}px`;
        }, 1);
      }
      function hideStreakTooltip() {
        if (!streakTooltip) return;
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
    if (qotdStreak) {
      qotdStreak.innerHTML = `<span class="streak-number">0</span> <span class="fire-icon">🔥</span>`;
    }
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
  const modalContainer = document.getElementById('qotdModalContainer');
  if (modalContainer) {
    importQOTDModals();
  }

  // If auth is already ready, run gating, load QOTD, and show streak
  if (authReady) {
    updateQOTDGating();
    loadQOTD();
    renderUserStreakAlways();
  }
});

// Guarded clearLocalQOTDAttempt
function clearLocalQOTDAttempt() {
  try {
    const today = getTodayStrEastern();
    localStorage.removeItem("qotd_attempt_" + today);
  } catch (e) {
    console.warn("[QOTD] Could not clear local QOTD attempt:", e);
  }
}

// Guarded auth event listeners
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
    if (!streakTooltip || !fireIcon) return;
    streakTooltip.textContent = `Current Streak: ${currentStreak}`;
    streakTooltip.style.display = 'block';
    streakTooltip.style.opacity = '1';
    setTimeout(() => {
      if (!fireIcon || !streakTooltip) return;
      const rect = fireIcon.getBoundingClientRect();
      const modalRect = modal ? modal.getBoundingClientRect() : { left: 0, top: 0 };
      streakTooltip.style.left = `${rect.left - modalRect.left + rect.width/2 - streakTooltip.offsetWidth/2}px`;
      streakTooltip.style.top = `${rect.top - modalRect.top - streakTooltip.offsetHeight - 12}px`;
    }, 1);
  }
  function hideStreakTooltip() {
    if (!streakTooltip) return;
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
// Guarded loadUserStatsModal
async function loadUserStatsModal() {
  const statsUserInfo = document.getElementById('statsUserInfo');
  const statsTotalAttempted = document.getElementById('statsTotalAttempted');
  const statsTotalCorrect = document.getElementById('statsTotalCorrect');
  const statsCurrentStreak = document.getElementById('statsCurrentStreak');
  const statsLongestStreak = document.getElementById('statsLongestStreak');
  const statsErrorMsg = document.getElementById('statsErrorMsg');
  const qotdStreak = document.getElementById('modalQotdStreak');
  const streakTooltip = document.getElementById('modalStreakTooltip');

  // Guard all required elements
  if (!statsUserInfo || !statsTotalAttempted || !statsTotalCorrect || !statsCurrentStreak || !statsLongestStreak || !statsErrorMsg) return;

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

  statsUserInfo.textContent = user.displayName
    ? `Username: ${user.displayName}`
    : `User: ${user.email}`;

  const attemptsRef = collection(db, "qotd_attempts");
  const q = query(attemptsRef, where("uid", "==", user.uid));
  try {
    const snap = await getDocs(q);
    const attempts = [];
    snap.forEach(doc => attempts.push(doc.data()));

    const totalAttempted = attempts.length;
    const totalCorrect = attempts.filter(a => a.correct).length;

    attempts.sort((a, b) => a.date.localeCompare(b.date));

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
        const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (daysDiff === 1) streak++;
        else streak = 1;
      } else {
        streak = 1;
      }
      prevDate = thisDate;
      if (streak > longestStreak) longestStreak = streak;
    }
    if (attempts.length && attempts[attempts.length - 1].date === getTodayStrEastern() && attempts[attempts.length - 1].correct) {
      currentStreak = streak;
    } else {
      currentStreak = 0;
    }

    statsTotalAttempted.textContent = totalAttempted;
    statsTotalCorrect.textContent = totalCorrect;
    statsCurrentStreak.textContent = currentStreak;
    statsLongestStreak.textContent = longestStreak;

    attachStreakTooltip(qotdStreak, streakTooltip, currentStreak);

  } catch (err) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "Error loading stats: " + err.message;
    if (qotdStreak) qotdStreak.innerHTML = "🔥";
  }
}

// Guarded loadLeaderboardModal
async function loadLeaderboardModal() {
  const leaderboardList = document.getElementById('leaderboardList');
  const leaderboardErrorMsg = document.getElementById('leaderboardErrorMsg');
  const leaderboardLoadingMsg = document.getElementById('leaderboardLoadingMsg');

  // Guard required elements
  if (!leaderboardList || !leaderboardErrorMsg || !leaderboardLoadingMsg) return;

  leaderboardErrorMsg.style.display = "none";
  leaderboardLoadingMsg.style.display = "block";
  leaderboardList.innerHTML = "";

  try {
    const attemptsRef = collection(db, "qotd_attempts");
    const snap = await getDocs(attemptsRef);

    const userStats = {};
    snap.forEach(doc => {
      const d = doc.data();
      if (!userStats[d.uid]) userStats[d.uid] = { correct: 0, attempted: 0, username: null };
      userStats[d.uid].attempted++;
      if (d.correct) userStats[d.uid].correct++;
    });

    const userEntries = Object.entries(userStats);
    userEntries.sort((a, b) => b[1].correct - a[1].correct || b[1].attempted - a[1].attempted);

    for (let i = 0; i < userEntries.length; ++i) {
      const uid = userEntries[i][0];
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        userEntries[i][1].username = userDoc.exists() ? (userDoc.data().username || uid) : uid;
      } catch {
        userEntries[i][1].username = uid;
      }
    }

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

// Guarded importQOTDModals
async function importQOTDModals() {
  let res, text, parser, doc;
  try {
    res = await fetch('qotd-stats.html');
    text = await res.text();
    parser = new DOMParser();
    doc = parser.parseFromString(text, 'text/html');
  } catch (err) {
    console.error("[QOTD] Error importing stat modals:", err);
    return;
  }
  const modalContainer = document.getElementById('qotdModalContainer');
  if (!modalContainer) return;

  const statsModal = doc.getElementById('userStatsModal');
  const leaderboardModal = doc.getElementById('leaderboardModal');
  if (statsModal) modalContainer.appendChild(statsModal);
  if (leaderboardModal) modalContainer.appendChild(leaderboardModal);

  const statsBtn = document.getElementById('qotdStatsBtn');
  const leaderboardBtn = document.getElementById('qotdLeaderboardBtn');
  if (statsBtn && statsModal) {
    statsBtn.onclick = () => {
      statsModal.style.display = 'flex';
      loadUserStatsModal();
    };
  }
  if (leaderboardBtn && leaderboardModal) {
    leaderboardBtn.onclick = () => {
      leaderboardModal.style.display = 'flex';
      loadLeaderboardModal();
    };
  }

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

// Guarded scheduleMidnightQOTDRefresh
function scheduleMidnightQOTDRefresh() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1) - now;
  setTimeout(() => {
    loadQOTD();
    renderUserStreakAlways();
    scheduleMidnightQOTDRefresh();
  }, msUntilMidnight);
}

if (typeof domReady !== "undefined" && typeof authReady !== "undefined" && domReady && authReady) {
  scheduleMidnightQOTDRefresh();
}

// Guarded showConfetti
function showConfetti() {
  const overlay = document.getElementById('confettiOverlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    const startLeft = Math.random() * 100;
    const endLeft = startLeft + (Math.random() * 20 - 10);

    particle.style.position = 'absolute';
    particle.style.left = startLeft + 'vw';
    particle.style.top = '-20px';
    particle.style.width = '10px';
    particle.style.height = '18px';
    particle.style.background = `hsl(${Math.random() * 360},80%,60%)`;
    particle.style.opacity = 0.7;
    particle.style.borderRadius = '3px';
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;
    const duration = 1.7 + Math.random() * (3.5 - 1.7);
    particle.style.transition = `top ${duration}s cubic-bezier(.2,.7,.3,1), left ${duration}s cubic-bezier(.2,.7,.3,1)`;
    overlay.appendChild(particle);

    setTimeout(() => {
      particle.style.top = '105vh';
      particle.style.left = endLeft + 'vw';
    }, 30);
  }

  setTimeout(() => {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    }
  }, 3500);
}

// Guarded updateStatsBox
export async function updateStatsBox() {
  const statsTotalCorrect = document.getElementById('statsTotalCorrect');
  const statsCurrentStreak = document.getElementById('statsCurrentStreak');
  const statsLongestStreak = document.getElementById('statsLongestStreak');
  const statsPercentCorrect = document.getElementById('statsPercentCorrect');
  const statsErrorMsg = document.getElementById('statsErrorMsg');

  if (!statsTotalCorrect || !statsCurrentStreak || !statsLongestStreak || !statsPercentCorrect || !statsErrorMsg) return;

  statsErrorMsg.style.display = "none";
  statsTotalCorrect.textContent = "...";
  statsCurrentStreak.textContent = "...";
  statsLongestStreak.textContent = "...";
  statsPercentCorrect.textContent = "...";

  const user = getUser();
  if (!user) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "Sign in to view your stats.";
    statsTotalCorrect.textContent = "--";
    statsCurrentStreak.textContent = "--";
    statsLongestStreak.textContent = "--";
    statsPercentCorrect.textContent = "--";
    return;
  }

  try {
    const attemptsRef = collection(db, "qotd_attempts");
    const q = query(attemptsRef, where("uid", "==", user.uid));
    const snap = await getDocs(q);
    const attempts = [];
    snap.forEach(doc => attempts.push(doc.data()));

    const totalAttempted = attempts.length;
    const totalCorrect = attempts.filter(a => a.correct).length;
    attempts.sort((a, b) => a.date.localeCompare(b.date));

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
        const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (daysDiff === 1) streak++;
        else streak = 1;
      } else {
        streak = 1;
      }
      prevDate = thisDate;
      if (streak > longestStreak) longestStreak = streak;
    }
    if (attempts.length && attempts[attempts.length - 1].date === getTodayStrEastern() && attempts[attempts.length - 1].correct) {
      currentStreak = streak;
    } else {
      currentStreak = 0;
    }

    const percentCorrect = totalAttempted > 0 ? ((100 * totalCorrect) / totalAttempted) : 0;

    statsTotalCorrect.textContent = totalCorrect;
    statsCurrentStreak.textContent = currentStreak;
    statsLongestStreak.textContent = longestStreak;
    statsPercentCorrect.textContent = percentCorrect.toFixed(1) + "%";
  } catch (err) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "Error loading stats: " + err.message;
    statsTotalCorrect.textContent = "--";
    statsCurrentStreak.textContent = "--";
    statsLongestStreak.textContent = "--";
    statsPercentCorrect.textContent = "--";
  }
}

// End of Logic
