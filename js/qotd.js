// Utility to get today's index
function getQOTDIndex(numQuestions) {
  // Use UTC date so it's consistent worldwide
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % numQuestions;
}

// Load questions.json and show today's QOTD with full submit/feedback logic
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

// Setup submit/feedback logic similar to final quiz
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

// Simulate a sign-in modal for demo mode
function showSignInModal(callback) {
  // Simple modal simulation
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(40,40,60,0.3)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '5000';

  modal.innerHTML = `
    <div style="background:#fff;padding:2em 2.3em;border-radius:13px;box-shadow:0 4px 18px rgba(0,0,0,0.13);text-align:center;max-width:340px;">
      <h3>Sign In</h3>
      <p>This is a demo modal.<br>Click below to simulate sign-in:</p>
      <button id="modalSignInConfirm" style="margin-top:14px;padding:9px 22px;border-radius:7px;background:#0077cc;color:#fff;font-weight:bold;border:none;cursor:pointer;">Sign In</button>
      <br>
      <button id="modalSignInCancel" style="margin-top:14px;padding:7px 20px;border-radius:7px;background:#eee;color:#333;border:none;cursor:pointer;">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#modalSignInCancel').onclick = () => {
    document.body.removeChild(modal);
    if (callback) callback(false);
  };
  modal.querySelector('#modalSignInConfirm').onclick = () => {
    document.body.removeChild(modal);
    if (callback) callback(true);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  loadQOTD().then(updateQOTDGating);

  // Sign in button logic
  const signInBtn = document.getElementById('qotdSignInBtn');
  if (signInBtn) {
    signInBtn.onclick = function() {
      showSignInModal(function(signedIn) {
        if (signedIn) {
          window.isSignedIn = true;
          updateQOTDGating();
        }
      });
    };
  }
});
