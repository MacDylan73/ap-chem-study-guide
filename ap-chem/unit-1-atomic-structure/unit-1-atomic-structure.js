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
  const resp = await fetch('/gating-modal.html');
  const html = await resp.text();
  document.body.insertAdjacentHTML('beforeend', html);
}
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

document.addEventListener('DOMContentLoaded', async () => {
  await loadAuthModal();
  setupAuthModalEvents();

  await loadUsernameModal();
  setupUsernameModal();

  await injectAccountModal();
  setupAccountModalEvents();

  await loadGatingModal();

  await loadTopbar("Unit 1: Atomic Structure");
  applySavedTheme();
  loadSidebar();

  setupUnitBottomBarButtons();
  updateUnitBottomBarAuthButtons();
  setupUnitBottomBarAuthSync();

  setupGating();
  setupGatingModalClose();
  setupQuizTimers();
  updateSubunitCheckmarks();
});

onAuthChange(async user => {
  if (user && user.providerData.some(p => p.providerId === "google.com")) {   
    await ensureUsernameOnLogin();
  }
  updateUnitBottomBarAuthButtons();
});
