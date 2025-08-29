// Utility to get today's index
function getQOTDIndex(numQuestions) {
  // Use UTC date so it's consistent worldwide
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % numQuestions;
}

// Load questions.json and show today's QOTD
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
    <div class="qotd-question">${q.question}</div>
    <div class="qotd-answers">
      ${q.answers.map((ans, i) => `<button class="qotd-answer-btn" data-idx="${i}">${ans}</button>`).join('')}
    </div>
    <div class="qotd-feedback" style="display:none"></div>
  `;
}

function updateQOTDGating() {
  const blurOverlay = document.getElementById('qotdBlurOverlay');
  const questionContent = document.getElementById('qotdQuestionContent');
  if (!window.isSignedIn) {
    blurOverlay.style.display = 'flex';
    questionContent.classList.add('blurred');
  } else {
    blurOverlay.style.display = 'none';
    questionContent.classList.remove('blurred');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadQOTD().then(updateQOTDGating);

  // Example sign in button click handler (stub)
  const signInBtn = document.getElementById('qotdSignInBtn');
  if (signInBtn) {
    signInBtn.onclick = function() {
      alert('Sign-in modal goes here!');
    };
  }
});
