import { loadTopbar } from '/js/topbar.js';
import { loadSidebar } from '/js/sidebar.js';
import {
  onAuthChange,
  signInHandler,
  signOutHandler,
  setupAuthModalEvents,
  ensureUsernameOnLogin,
  updateUnitBottomBarAuthButtons,
  setupUnitBottomBarButtons,
  setupUnitBottomBarAuthSync
} from '/js/auth.js';
import { toggleTheme, applySavedTheme } from '/js/theme-toggle.js';
window.toggleTheme = toggleTheme;
import { setupUsernameModal } from '/js/username-modal.js';
import { setupGating, setupGatingModalClose } from '/js/gating.js';
import '/js/util.js';
import { setupQuizTimers, updateSubunitCheckmarks } from '/js/questions.js';
import { injectAccountModal, setupAccountModalEvents } from '/js/account-modal.js';

async function loadGatingModal() {
  const resp = await fetch('/components/gating-modal.html');
  const html = await resp.text();
  document.body.insertAdjacentHTML('beforeend', html);
}
async function loadAuthModal() {
  const resp = await fetch('/components/auth-modal.html');
  const html = await resp.text();
  document.body.insertAdjacentHTML('beforeend', html);
}
async function loadUsernameModal() {
  const resp = await fetch('/components/username-modal.html');
  const html = await resp.text();
  document.body.insertAdjacentHTML('beforeend', html);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAuthModal();
  setupAuthModalEvents();

  await loadUsernameModal();
  setupUsernameModal();

  await injectAccountModal();
  setupAccountModalEvents();

  await loadGatingModal();

  await loadTopbar("Unit 4: Chemical Reactions");
  applySavedTheme();
  loadSidebar();

  setupUnitBottomBarButtons();
  updateUnitBottomBarAuthButtons();
  setupUnitBottomBarAuthSync();

  // Attach event listeners for bottom bar buttons (CSP compliance)
  const nextUnitBtn = document.getElementById('nextUnitBtn');
  if (nextUnitBtn) {
    nextUnitBtn.addEventListener('click', () => {
      window.location.href = '/ap-chem/unit-5-kinetics/';
    });
  }
  const futureFeatureBtn = document.getElementById('futureFeatureBtn');
  if (futureFeatureBtn) {
    futureFeatureBtn.addEventListener('click', () => {
      window.open('https://forms.gle/CTyDuLatR2WVnKLs9', '_blank');
    });
  }

  setupGating();
  setupGatingModalClose();
  setupQuizTimers();
  updateSubunitCheckmarks();

  // Attach event listeners to subunit quiz answer buttons (CSP compliance)
  document.querySelectorAll('.subunit .answer-options button[data-correct]').forEach(btn => {
    btn.addEventListener('click', function() {
      const isCorrect = btn.getAttribute('data-correct') === 'true';
      const explanation = btn.getAttribute('data-explanation') || '';
      const feedback = btn.closest('.question-box').querySelector('.feedback-text');
      // Highlight all choices
      btn.parentElement.querySelectorAll('button').forEach(b => {
        b.classList.remove('selected', 'correct', 'incorrect');
      });
      btn.classList.add('selected');
      btn.classList.add(isCorrect ? 'correct' : 'incorrect');
      if (feedback) {
        feedback.textContent = explanation;
        feedback.style.color = isCorrect ? 'green' : 'red';
      }
      // Mark question as answered for progress tracking
      if (typeof window.checkAnswer === 'function') {
        window.checkAnswer(btn, isCorrect, explanation);
      }
    });
  });
});

onAuthChange(async user => {
  if (user && user.providerData.some(p => p.providerId === "google.com")) {
    await ensureUsernameOnLogin();
  }
  updateUnitBottomBarAuthButtons();
});
