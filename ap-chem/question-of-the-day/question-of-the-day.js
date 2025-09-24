// Inline JS from /ap-chem/question-of-the-day/index.html

// ---------- Shared imports ----------
import { loadTopbar } from '/js/topbar.js';
import { loadSidebar } from '/js/sidebar.js';
import {
  onAuthChange,
  setupAuthModalEvents,
  ensureUsernameOnLogin,
  updateUnitBottomBarAuthButtons,
  db // <-- Make sure db is imported here!
} from '/js/auth.js';
import { toggleTheme, applySavedTheme } from '/js/theme-toggle.js';
window.toggleTheme = toggleTheme;
import { setupUsernameModal } from '/js/username-modal.js';
import { loadQOTD, renderUserStreakAlways, updateStatsBox } from '/js/qotd.js';
import { setupLeaderboardTabs, loadLeaderboard } from '/js/leaderboard.js';
import { injectAccountModal, setupAccountModalEvents } from '/js/account-modal.js';

// ---------- Modal loader functions ----------
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

// ---------- DOM Ready setup ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadAuthModal();           // 1. Inject HTML for Auth modal
  setupAuthModalEvents();          // 2. Setup events for Auth modal

  await loadUsernameModal();       // 3. Inject HTML for Username modal
  setupUsernameModal();            // 4. Setup events for Username modal

  await injectAccountModal();      // 5. Inject HTML for Account modal
  setupAccountModalEvents();       // 6. Setup events for Account modal
  loadTopbar("AP Chem Question of the Day");
  loadSidebar();
  applySavedTheme();

  // QOTD logic
  await loadQOTD();
  renderUserStreakAlways();
  updateStatsBox();

  // Leaderboard setup - FIXED: pass db!
  setupLeaderboardTabs((metric) => loadLeaderboard(metric, db));
  loadLeaderboard("total", db);

  // Bottom bar auth logic
  updateUnitBottomBarAuthButtons();
});

// ---------- Auth Change Event for Stats & Streak ----------
onAuthChange(async user => {
  // Only show username modal for Google sign-in
  if (user && user.providerData.some(p => p.providerId === "google.com")) {
    await ensureUsernameOnLogin();
  }
  updateUnitBottomBarAuthButtons();
  renderUserStreakAlways();
  updateStatsBox();
  loadLeaderboard("total", db);
});
