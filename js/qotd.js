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
function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ------------------ QOTD Display Logic (index page) -------------------

async function loadQOTD() {
  const res = await fetch('questions.json');
  const questions = await res.json();
  const idx = getQOTDIndex(questions.length);
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
    </div>
  `;

  // ------- Check for previous attempt ------
  await checkQOTDAttempt(q); // Will setup handlers, or show feedback if already answered
}

async function checkQOTDAttempt(q) {
  const today = getTodayStr();
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

    const today = getTodayStr();
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
  } else {
    feedbackDiv.textContent = "Incorrect! The correct answer was: " + q.answers[q.correct];
    feedbackDiv.classList.add('incorrect');
    feedbackDiv.classList.remove('correct');
  }
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

// ------------------ QOTD Stats & Leaderboard Logic (qotd-stats.html) -------------------

// Loads and populates user stats modal
async function loadUserStatsModal() {
  const statsUserInfo = document.getElementById('statsUserInfo');
  const statsTotalAttempted = document.getElementById('statsTotalAttempted');
  const statsTotalCorrect = document.getElementById('statsTotalCorrect');
  const statsCurrentStreak = document.getElementById('statsCurrentStreak');
  const statsLongestStreak = document.getElementById('statsLongestStreak');
  const statsErrorMsg = document.getElementById('statsErrorMsg');

  // Clear previous
  statsErrorMsg.style.display = "none";
  statsUserInfo.textContent = "";
  statsTotalAttempted.textContent = "...";
  statsTotalCorrect.textContent = "...";
  statsCurrentStreak.textContent = "...";
  statsLongestStreak.textContent = "...";

  const user = getUser();
  if (!user) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "You must be signed in to view your stats.";
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
    if (attempts.length && attempts[attempts.length-1].date === getTodayStr() && attempts[attempts.length-1].correct) {
      currentStreak = streak;
    } else {
      currentStreak = 0;
    }

    statsTotalAttempted.textContent = totalAttempted;
    statsTotalCorrect.textContent = totalCorrect;
    statsCurrentStreak.textContent = currentStreak;
    statsLongestStreak.textContent = longestStreak;
  } catch (err) {
    statsErrorMsg.style.display = "block";
    statsErrorMsg.textContent = "Error loading stats: " + err.message;
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
    leaderboardErrorMsg.textContent = "Error loading leaderboard: " + err.message;
  }
}

// --------- Modal open event hooks for qotd-stats.html ---------
if (document.getElementById('openStatsModalBtn')) {
  document.getElementById('openStatsModalBtn').onclick = () => {
    document.getElementById('userStatsModal').style.display = 'flex';
    loadUserStatsModal();
  };
}
if (document.getElementById('openLeaderboardModalBtn')) {
  document.getElementById('openLeaderboardModalBtn').onclick = () => {
    document.getElementById('leaderboardModal').style.display = 'flex';
    loadLeaderboardModal();
  };
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

  // If auth is already ready, run gating and load QOTD
  if (authReady) {
    updateQOTDGating();
    loadQOTD();
  }
});

document.addEventListener('authstatechanged', function(e) {
  window.isSignedIn = !!(e.detail && e.detail.user);
  authReady = true;
  console.log("[QOTD] authstatechanged event, isSignedIn:", window.isSignedIn);

  // Only run gating and load QOTD when DOM is ready
  if (domReady) {
    updateQOTDGating();
    loadQOTD();
  }
});

document.addEventListener('user-signed-in', function() {
  window.isSignedIn = true;
  authReady = true;
  if (domReady) updateQOTDGating();
});

// ---- End of AP Chem QOTD logic ----
