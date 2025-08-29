// Utility to get today's index
function getQOTDIndex(numQuestions) {
  // Use UTC date so it's consistent worldwide
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % numQuestions;
}

// Load questions.json and show today's QOTD with submit/feedback functionality
async function loadQOTD() {
  console.log('Loading QOTD...');
  const res = await fetch('questions.json');
  const questions = await res.json();
  console.log('Questions loaded:', questions);

  const idx = getQOTDIndex(questions.length);
  const q = questions[idx];

  // Render question and answer buttons
  const container = document.getElementById('qotdQuestionContent');
  if (!container) return;

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

  setupQOTDHandlers(q);
}

// Setup submit/feedback logic
function setupQOTDHandlers(q) {
  const container = document.getElementById('qotdQuestionContent');
  let selectedIdx = null;
  const answerBtns = container.querySelectorAll('.qotd-answer-btn');
  const submitBtn = container.querySelector('#qotdSubmitBtn');
  const feedbackDiv = container.querySelector('.qotd-feedback');

  answerBtns.forEach(btn => {
    btn.onclick = function() {
      selectedIdx = parseInt(btn.dataset.idx, 10);
      // Highlight selected
      answerBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      submitBtn.style.display = 'inline-block';
      submitBtn.disabled = false;
      feedbackDiv.style.display = 'none';
      feedbackDiv.textContent = '';
      feedbackDiv.classList.remove('correct', 'incorrect');
    };
  });

  submitBtn.onclick = function() {
    if (selectedIdx === null) return;
    submitBtn.disabled = true;
    answerBtns.forEach(b => b.disabled = true);

    feedbackDiv.style.display = 'block';
    if (selectedIdx === q.correct) {
      feedbackDiv.textContent = "Correct!";
      feedbackDiv.classList.add('correct');
    } else {
      feedbackDiv.textContent = "Incorrect! The correct answer was: " + q.answers[q.correct];
      feedbackDiv.classList.add('incorrect');
    }
  };
}

// Gating logic for blur/overlay
function updateQOTDGating() {
  const blurOverlay = document.getElementById('qotdBlurOverlay');
  const questionContent = document.getElementById('qotdQuestionContent');
  if (!blurOverlay || !questionContent) return;
  if (!window.isSignedIn) {
    blurOverlay.style.display = 'flex';
    questionContent.classList.add('blurred');
  } else {
    blurOverlay.style.display = 'none';
    questionContent.classList.remove('blurred');
  }
}

// Use the shared sign-in modal logic from auth-modal.html
function showAppSignInModal() {
  // This assumes your main modal is triggered by a function or a button, e.g. "signInBtn" in the top bar.
  // You may want to replace this with the exact function call or event dispatch your app uses.
  const mainSignInBtn = document.getElementById('signInBtn');
  if (mainSignInBtn) {
    mainSignInBtn.click();
    return true;
  }
  // If your modal has a global function like window.showAuthModal, call it:
  if (typeof window.showAuthModal === "function") {
    window.showAuthModal();
    return true;
  }
  // Otherwise, you may need to trigger the modal programmatically (custom to your app)
  alert("Sign-in modal could not be triggered. Please check your modal integration.");
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  loadQOTD().then(updateQOTDGating);

  // QOTD sign-in button triggers main sign-in modal logic
  const qotdSignInBtn = document.getElementById('qotdSignInBtn');
  if (qotdSignInBtn) {
    qotdSignInBtn.onclick = function() {
      showAppSignInModal();
    };
  }

  // Listen for global sign-in event (if your app emits one after sign-in)
  // For example, your sign-in modal might dispatch a CustomEvent:
  // window.dispatchEvent(new CustomEvent('user-signed-in'));
  window.addEventListener('user-signed-in', function() {
    window.isSignedIn = true;
    updateQOTDGating();
  });

  // If you set window.isSignedIn elsewhere, call updateQOTDGating() after sign-in in your main auth flow.
});
