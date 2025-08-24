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

// Gating modal close/setup logic
export function setupGatingModalClose() {
  const gatingModal = document.getElementById('signupModal');
  const closeBtn = document.getElementById('closeSignupModal');
  const signUpBtn = document.getElementById('signupModalSignInBtn');
  const signInModal = document.getElementById('signInModal');

  // Close modal when clicking X
  if (closeBtn) {
    closeBtn.onclick = () => {
      gatingModal.style.display = 'none';
    };
  }

  // Sign Up button logic: open sign-in modal
  if (signUpBtn) {
    signUpBtn.onclick = () => {
      gatingModal.style.display = 'none';
      if (signInModal) {
        signInModal.style.display = 'block';
      }
    };
  }

  // Close modal when clicking outside modal content
  window.addEventListener('click', function(e) {
    if (gatingModal && e.target === gatingModal) {
      gatingModal.style.display = 'none';
    }
  });

  // Close modal with ESC key
  window.addEventListener('keydown', function(e) {
    if (gatingModal && gatingModal.style.display === 'block' && e.key === 'Escape') {
      gatingModal.style.display = 'none';
    }
  });
}
