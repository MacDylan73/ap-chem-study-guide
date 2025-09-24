// Inline JS from root index.html

// Countdown logic
window.addEventListener('DOMContentLoaded', function() {
  renderCountdown("countdownText", "May 5, 2026");
});

// Modular JS imports for all UI and authentication logic
import { loadTopbar } from './js/topbar.js';
import { loadSidebar } from './js/sidebar.js';
import {
  onAuthChange,
  signInHandler,
  signOutHandler,
  setupAuthModalEvents,
  ensureUsernameOnLogin,
  updateIndexBarAuthButtons
} from './js/auth.js';
import { toggleTheme, applySavedTheme } from './js/theme-toggle.js';
window.toggleTheme = toggleTheme;
import { setupUsernameModal } from './js/username-modal.js';
import './js/qotd.js';
import './js/progress.js';
import { injectAccountModal, setupAccountModalEvents } from './js/account-modal.js';

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
  await loadAuthModal(); setupAuthModalEvents();
  await loadUsernameModal(); setupUsernameModal();
  await injectAccountModal(); setupAccountModalEvents();
  await loadTopbar("AP Prep Hub");
  applySavedTheme();
  loadSidebar();
  updateIndexBarAuthButtons();
});

document.addEventListener('DOMContentLoaded', () => {
  const qotdArea = document.querySelector('.qotd-question-area');
  const signInBtn = document.getElementById('qotdSignInBtn');
  if (qotdArea) {
    qotdArea.addEventListener('click', function(e) {
      if (signInBtn && signInBtn.contains(e.target)) return;
  window.location.href = '/ap-chem/question-of-the-day/';
    });
  }
});

onAuthChange(async user => {
  if (user && user.providerData.some(p => p.providerId === "google.com")) {
    await ensureUsernameOnLogin();
  }
  updateIndexBarAuthButtons();
});
