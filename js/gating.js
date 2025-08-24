// Soft gating logic for units (modularized)
export function setupGating(maxFreeClicks = 3) {
  let clickCount = parseInt(localStorage.getItem("unitClicks")) || 0;

  function isGated() {
    return !window.isSignedIn && clickCount >= maxFreeClicks;
  }
  function showModal() {
    const signupModal = document.getElementById("signupModal");
    if (signupModal) signupModal.style.display = "block";
  }
  function updateClickCount() {
    clickCount++;
    localStorage.setItem("unitClicks", clickCount);
    if (isGated()) showModal();
  }
  function unlockContent() {
    window.isSignedIn = true;
    localStorage.removeItem("unitClicks");
    showModal(false);
    // Optionally: call updateIndexBarAuthButtons() or reload bar
  }

  document.querySelectorAll(".subunit-header").forEach(link => {
    link.addEventListener("click", (e) => {
      if (isGated()) {
        e.preventDefault();
        showModal();
        return;
      }
      updateClickCount();
    });
  });

  window.unlockContent = unlockContent;
}
