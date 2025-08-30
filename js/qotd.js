// ---- AP Chem QOTD Logic with Firestore Attempt Tracking ----
// This file handles displaying the QOTD, gating based on sign-in, and saving/limiting attempts per user per day.

console.log("[QOTD] qotd.js loaded");

// ---- Only run gating logic after DOM is ready and auth state is known ----
let domReady = false;
let authReady = false;

// ---- Firebase Firestore setup ----
// (Assumes you have exported 'db' and 'getUser' from auth.js for Firestore and current user info)
import { db, getUser } from './auth.js';
import {
  doc, setDoc, getDoc
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

/**
 * Loads the QOTD from questions.json and sets up everything
 * Adds code to check for previous attempts in localStorage and Firestore
 */
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

  // ------- New: Check for previous attempt ------
  await checkQOTDAttempt(q); // Will setup handlers, or show feedback if already answered
}

/**
 * Checks if user has already attempted today's QOTD
 * - Checks localStorage first (fast)
 * - Then checks Firestore (secure, if localStorage missing)
 * - If already answered, shows feedback and disables UI
 * - Otherwise, sets up handlers for answering
 */
async function checkQOTDAttempt(q) {
  const today = getTodayStr();
  const container = document.getElementById('qotdQuestionContent');
  const feedbackDiv = container.querySelector('.qotd-feedback');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');

  // --- Try localStorage first ---
  const lsKey = "qotd_attempt_" + today;
  const local = localStorage.getItem(lsKey);
  if (local) {
    // User already answered today (locally)
    const { answerIndex, correct } = JSON.parse(local);
    showQOTDFeedback(correct, q, answerIndex);
    disableQOTDButtons(answerBtns, submitBtn);
    return;
  }

  // --- Check Firestore for an official record ---
  const user = getUser();
  if (!user) {
    // Not signed in: just set up handlers (gating will block answers anyway)
    setupQOTDHandlers(q);
    return;
  }
  const uid = user.uid;
  const docId = `${uid}_${today}`;
  const attemptRef = doc(db, "qotd_attempts", docId);
  try {
    const attemptSnap = await getDoc(attemptRef);
    if (attemptSnap.exists()) {
      // Official attempt found
      const { answerIndex, correct } = attemptSnap.data();
      showQOTDFeedback(correct, q, answerIndex);
      disableQOTDButtons(answerBtns, submitBtn);
      // Save to localStorage for UI persistence
      localStorage.setItem(lsKey, JSON.stringify({ answerIndex, correct }));
      return;
    }
  } catch (err) {
    console.error("[QOTD] Error fetching Firestore attempt doc:", err);
  }

  // --- No attempt: allow answering ---
  setupQOTDHandlers(q);
}

/**
 * Sets up event handlers for answer buttons and submit button
 * Saves answer to Firestore and localStorage on submit
 * Ensures only one attempt per day per account
 */
function setupQOTDHandlers(q) {
  const container = document.getElementById('qotdQuestionContent');
  let selectedIdx = null;
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const feedbackDiv = container.querySelector('.qotd-feedback');

  // --- Answer button click handler ---
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

  // --- Submit button handler ---
  submitBtn.onclick = async function() {
    if (selectedIdx === null) return;
    submitBtn.disabled = true;
    answerBtns.forEach(b => b.disabled = true);

    const correct = (selectedIdx === q.correct);

    // --- Show feedback in UI ---
    showQOTDFeedback(correct, q, selectedIdx);

    // --- Save to localStorage for UI persistence ---
    const today = getTodayStr();
    const lsKey = "qotd_attempt_" + today;
    localStorage.setItem(lsKey, JSON.stringify({ answerIndex: selectedIdx, correct }));

    // --- Save to Firestore for secure record ---
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

/**
 * Shows feedback after answer (correct/incorrect), disables further attempts
 * @param {boolean} correct - whether the answer was correct
 * @param {object} q - question object
 * @param {number} selectedIdx - which answer was chosen
 */
function showQOTDFeedback(correct, q, selectedIdx) {
  const container = document.getElementById('qotdQuestionContent');
  const feedbackDiv = container.querySelector('.qotd-feedback');
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');

  // Highlight selected button and disable all
  answerBtns.forEach((b, i) => {
    b.disabled = true;
    b.classList.toggle('selected', i === selectedIdx);
  });
  submitBtn.disabled = true;
  submitBtn.style.display = 'none';

  // Show feedback
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

/**
 * Disables answer buttons and submit button in the UI
 */
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
