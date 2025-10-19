//Dropdowns ------------------------------
// Toggle for subunit dropdowns

export function setupSubunitDropdowns() {
  document.querySelectorAll('.subunit-header').forEach(button => {
    // Remove previous listeners to avoid duplicates
    button.removeEventListener('click', button._dropdownHandler);
    button._dropdownHandler = () => {
      button.classList.toggle('active');
    };
    button.addEventListener('click', button._dropdownHandler);
  });
}

//COUNTDOWN TIMER --------------------------
export function renderCountdown(elementId, examDateStr) {
  const examDate = new Date(examDateStr);
  const today = new Date();
  const diffTime = examDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = `${diffDays} days until the AP Chemistry exam!`;
  }
}

// Google Analytics initialization
if (!window.GA_INITIALIZED) {
  window.GA_INITIALIZED = true;
  // Load the Google Analytics library
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-X2H058B7KT';
  document.head.appendChild(gaScript);

  // Initialize Google Analytics after script loads
  gaScript.onload = function() {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-X2H058B7KT');
  };
}

