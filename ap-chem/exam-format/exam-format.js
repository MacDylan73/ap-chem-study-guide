// Inline JS from /ap-chem/exam-format/index.html

// Countdown logic
window.addEventListener('DOMContentLoaded', function() {
  renderCountdown("countdownText", "May 5, 2026");
});

// Modular JS imports for all UI and authentication logic
import { loadTopbar } from '/js/topbar.js';
import { loadSidebar } from '/js/sidebar.js';
import {
  onAuthChange,
  signInHandler,
  signOutHandler,
  setupAuthModalEvents,
  ensureUsernameOnLogin,
  updateIndexBarAuthButtons
} from '/js/auth.js';
import { toggleTheme, applySavedTheme } from '/js/theme-toggle.js';
window.toggleTheme = toggleTheme;
import { setupUsernameModal } from '/js/username-modal.js';
import '/js/qotd.js';
import '/js/progress.js';
import { injectAccountModal, setupAccountModalEvents } from '/js/account-modal.js';

async function loadAuthModal() {
  const resp = await fetch('/auth-modal.html');
  const html = await resp.text();
  document.body.insertAdjacentHTML('beforeend', html);
}
async function loadUsernameModal() {
  const resp = await fetch('/username-modal.html');
  const html = await resp.text();
  document.body.insertAdjacentHTML('beforeend', html);
}

// Render all elements

document.addEventListener('DOMContentLoaded', async () => {
  await loadAuthModal();           // 1. Inject HTML for Auth modal
  setupAuthModalEvents();          // 2. Setup events for Auth modal

  await loadUsernameModal();       // 3. Inject HTML for Username modal
  setupUsernameModal();            // 4. Setup events for Username modal

  await injectAccountModal();      // 5. Inject HTML for Account modal
  setupAccountModalEvents();       // 6. Setup events for Account modal

  await loadTopbar("AP Chemistry Course Guide and Practice Tests");
  applySavedTheme();
  loadSidebar();
  updateIndexBarAuthButtons();
});

onAuthChange(async user => {
  if (user && user.providerData.some(p => p.providerId === "google.com")) {
    await ensureUsernameOnLogin();
  }
  updateIndexBarAuthButtons();
});
