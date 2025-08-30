// Utility to get today's index
function getQOTDIndex(numQuestions) {
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % numQuestions;
}

async function loadQOTD() {
  const res = await fetch('questions.json');
  const questions = await res.json();
  const idx = getQOTDIndex(questions.length);
  const q = questions[idx];

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

function updateQOTDGating() {
  const blurOverlay = document.getElementById('qotdBlurOverlay');
  const questionContent = document.getElementById('qotdQuestionContent');
  console.log("[QOTD] updateQOTDGating, window.isSignedIn:", window.isSignedIn);

  if (!blurOverlay || !questionContent) return;
  if (window.isSignedIn === undefined) {
    // Don't show anything until auth state is known
    blurOverlay.style.display = 'flex';
    questionContent.classList.add('blurred');
    return;
  }
  if (!window.isSignedIn) {
    blurOverlay.style.display = 'flex';
    questionContent.classList.add('blurred');
  } else {
    blurOverlay.style.display = 'none';
    questionContent.classList.remove('blurred');
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

document.addEventListener('DOMContentLoaded', () => {
  loadQOTD();

  // Listen for auth state changes - covers sign-in on page load and after sign-in
  window.addEventListener('authstatechanged', function(e) {
    window.isSignedIn = !!(e.detail && e.detail.user);
    console.log("[QOTD] authstatechanged event, isSignedIn:", window.isSignedIn);
    updateQOTDGating();
  });

  // Also listen for global sign-in event for extra compatibility
  window.addEventListener('user-signed-in', function() {
    window.isSignedIn = true;
    console.log("[QOTD] user-signed-in event");
    updateQOTDGating();
  });

  // QOTD sign-in button triggers main sign-in modal logic
  const qotdSignInBtn = document.getElementById('qotdSignInBtn');
  if (qotdSignInBtn) {
    qotdSignInBtn.onclick = function() {
      showAppSignInModal();
    };
  }
});
