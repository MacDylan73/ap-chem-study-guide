// Main logic for AP Chem exam score calculator
// This file now waits for the calculator HTML to be present before initializing,
// so it's safe to use with dynamic insertion via fetch.

// Wrap all setup in a function
function initScoreCalculator() {
  // MCQ
  const mcqSlider = document.getElementById("mcq-slider");
  const mcqScore = document.getElementById("mcq-score");
  if (!mcqSlider || !mcqScore) return; // Don't run if calculator not present

  // Long FRQ
  const longScores = [0, 0, 0];
  const longBoxes = [
    document.getElementById("frq-long-0"),
    document.getElementById("frq-long-1"),
    document.getElementById("frq-long-2")
  ];
  const longSetAllBox = document.getElementById("frq-long-setall");

  // Short FRQ
  const shortScores = [0, 0, 0, 0];
  const shortBoxes = [
    document.getElementById("frq-short-0"),
    document.getElementById("frq-short-1"),
    document.getElementById("frq-short-2"),
    document.getElementById("frq-short-3")
  ];
  const shortSetAllBox = document.getElementById("frq-short-setall");

  // Predicted score
  const predictedScoreElem = document.getElementById("calc-score-predicted");

  // Utility functions
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  // --- MCQ slider ---
  mcqSlider.addEventListener("input", () => {
    mcqScore.textContent = mcqSlider.value;
    updatePredictedScore();
  });

  // --- FRQ arrow logic ---
  document.querySelectorAll(".calc-arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      const frqType = btn.getAttribute("data-frq");
      const idx = btn.getAttribute("data-idx");
      const isUp = btn.classList.contains("calc-arrow-up");
      // Handle Long FRQ
      if (frqType === "long") {
        if (idx === "setall") {
          let v = Number(longSetAllBox.textContent.split('/')[0]);
          v = clamp(v + (isUp ? 1 : -1), 0, 10);
          longSetAllBox.textContent = `${v}/10`;
          for (let i = 0; i < longScores.length; i++) {
            longScores[i] = v;
            longBoxes[i].textContent = v;
          }
        } else {
          let i = Number(idx);
          let v = longScores[i];
          v = clamp(v + (isUp ? 1 : -1), 0, 10);
          longScores[i] = v;
          longBoxes[i].textContent = v;
          // If all 3 match, update setall
          if (longScores.every(x => x === v)) {
            longSetAllBox.textContent = `${v}/10`;
          }
        }
      }
      // Handle Short FRQ
      if (frqType === "short") {
        if (idx === "setall") {
          let v = Number(shortSetAllBox.textContent.split('/')[0]);
          v = clamp(v + (isUp ? 1 : -1), 0, 4);
          shortSetAllBox.textContent = `${v}/4`;
          for (let i = 0; i < shortScores.length; i++) {
            shortScores[i] = v;
            shortBoxes[i].textContent = v;
          }
        } else {
          let i = Number(idx);
          let v = shortScores[i];
          v = clamp(v + (isUp ? 1 : -1), 0, 4);
          shortScores[i] = v;
          shortBoxes[i].textContent = v;
          // If all 4 match, update setall
          if (shortScores.every(x => x === v)) {
            shortSetAllBox.textContent = `${v}/4`;
          }
        }
      }
      updatePredictedScore();
    });
  });

  // --- SetAll boxes allow direct sync if all scores match ---
  function syncSetAllBoxes() {
    // Long
    if (longScores.every(x => x === longScores[0])) {
      longSetAllBox.textContent = `${longScores[0]}/10`;
    } else {
      longSetAllBox.textContent = '--/10';
    }
    // Short
    if (shortScores.every(x => x === shortScores[0])) {
      shortSetAllBox.textContent = `${shortScores[0]}/4`;
    } else {
      shortSetAllBox.textContent = '--/4';
    }
  }
  setInterval(syncSetAllBoxes, 500);

  // --- Main Score Calculation ---
  function updatePredictedScore() {
    // MCQ: 60 questions, 50%
    // FRQ: 3 long (10 pts ea), 4 short (4 pts ea), total 3*10+4*4=52 pts, 50%
    const mcqRaw = Number(mcqSlider.value);
    const mcqPercent = mcqRaw / 60;
    const frqRaw = longScores.reduce((a,b)=>a+b,0) + shortScores.reduce((a,b)=>a+b,0);
    const frqPercent = frqRaw / 52;

    // Weighted percent
    const weightedPercent = 0.5 * mcqPercent + 0.5 * frqPercent;

    // Map to AP score (estimates based on released exams)
    let apScore = 1;
    if (weightedPercent >= 0.72) apScore = 5;
    else if (weightedPercent >= 0.60) apScore = 4;
    else if (weightedPercent >= 0.48) apScore = 3;
    else if (weightedPercent >= 0.35) apScore = 2;
    else apScore = 1;

    predictedScoreElem.textContent = apScore;
  }

  updatePredictedScore();
}

// Try to initialize right away (for static HTML use)
initScoreCalculator();

// Also re-initialize if HTML is dynamically inserted
// (e.g. via fetch into #score-calculator-container)
const observer = new MutationObserver((mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      // If calculator HTML appears, initialize!
      if (document.getElementById("mcq-slider")) {
        initScoreCalculator();
        break;
      }
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });
