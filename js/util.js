//Dropdowns ------------------------------
// Toggle for subunit dropdowns
document.querySelectorAll('.subunit-header').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
    });
});

//COUNTDOWN TIMER --------------------------
function renderCountdown(elementId, examDateStr) {
  const examDate = new Date(examDateStr);
  const today = new Date();
  const diffTime = examDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = `${diffDays} days until the AP Chemistry exam!`;
  }
}
