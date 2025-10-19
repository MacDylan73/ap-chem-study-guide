
import { renderCountdown } from '/js/util.js';

// Countdown logic
window.addEventListener('DOMContentLoaded', function() {
  renderCountdown("countdownText", "May 5, 2026");
});

// Modular JS imports for all UI and authentication logic
// (converted from inline <script type="module">)
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
  try {
    const resp = await fetch('/components/auth-modal.html');
    if (!resp.ok) throw new Error('Failed to load auth modal');
    const html = await resp.text();
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (err) {
    console.error('Error loading auth modal:', err);
  }
}
async function loadUsernameModal() {
  try {
    const resp = await fetch('/components/username-modal.html');
    if (!resp.ok) throw new Error('Failed to load username modal');
    const html = await resp.text();
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (err) {
    console.error('Error loading username modal:', err);
  }
}

// Render all elements

document.addEventListener('DOMContentLoaded', async () => {
  await loadAuthModal();           // 1. Inject HTML for Auth modal
  setupAuthModalEvents();          // 2. Setup events for Auth modal

  await loadUsernameModal();       // 3. Inject HTML for Username modal
  setupUsernameModal();            // 4. Setup events for Username modal

  try {
    await injectAccountModal();      // 5. Inject HTML for Account modal
    setupAccountModalEvents();       // 6. Setup events for Account modal
  } catch (err) {
    console.error('Error loading account modal:', err);
  }

  await loadTopbar("AP Chemistry Course Guide and Practice Tests");
  applySavedTheme();
  loadSidebar();
  updateIndexBarAuthButtons();

  // Attach event listeners for CSP compliance
  const returnToHubBtn = document.getElementById('returnToHub');
  if (returnToHubBtn) {
    returnToHubBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  const futureFeatureBtn = document.getElementById('futureFeatureBtn');
  if (futureFeatureBtn) {
    futureFeatureBtn.addEventListener('click', () => {
      window.open('https://forms.gle/CTyDuLatR2WVnKLs9', '_blank');
    });
  }
});

// Redirect QOTD Box 
// Make QOTD question area clickable, except for sign-in button
document.addEventListener('DOMContentLoaded', () => {
  const qotdArea = document.querySelector('.qotd-question-area');
  const signInBtn = document.getElementById('qotdSignInBtn');
  if (qotdArea) {
    qotdArea.addEventListener('click', function(e) {
      if (signInBtn && signInBtn.contains(e.target)) return;
      window.location.href = '../question-of-the-day/';
    });
  }
});

// Listen for auth state changes, update UI, and ensure username modal is shown if needed
onAuthChange(async user => {
  // Only show username modal for Google sign-in
  if (user && user.providerData.some(p => p.providerId === "google.com")) {
    await ensureUsernameOnLogin();
  }
  updateIndexBarAuthButtons();
  // Any additional UI updates can go here
});
