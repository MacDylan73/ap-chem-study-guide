// Main logic for AP Chem exam score calculator
// This file now waits for the calculator HTML to be present before initializing,
// so it's safe to use with dynamic insertion via fetch.

// Fetch and insert the score calculator HTML, then initialize logic
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('score-calculator-container');
  if (container) {
    fetch('score-calculator.html')
      .then(response => {
        if (!response.ok) throw new Error('Could not load score-calculator.html');
        return response.text();
      })
      .then(html => {
        container.innerHTML = html;
        initScoreCalculator();
      })
      .catch(err => {
        container.innerHTML = '<p style="color:red">Score calculator could not be loaded.</p>';
        console.error(err);
      });
  }
});

function initScoreCalculator() {
  // MCQ
  const mcqSlider = document.getElementById("mcq-slider");
  const mcqScore = document.getElementById("mcq-score");
  if (!mcqSlider || !mcqScore) return;

  // Long FRQ
  const longScores = [0, 0, 0];
  const longBoxes = [
    document.getElementById("frq-long-0"),
    document.getElementById("frq-long-1"),
    document.getElementById("frq-long-2")
  ];
  const longSetAllBox = document.getElementById("frq-long-setall");
  let longSetAllValue = 0; // Always a number

  // Short FRQ
  const shortScores = [0, 0, 0, 0];
  const shortBoxes = [
    document.getElementById("frq-short-0"),
    document.getElementById("frq-short-1"),
    document.getElementById("frq-short-2"),
    document.getElementById("frq-short-3")
  ];
  const shortSetAllBox = document.getElementById("frq-short-setall");
  let shortSetAllValue = 0; // Always a number

  // Predicted score
  const predictedScoreElem = document.getElementById("calc-score-predicted");

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  mcqSlider.addEventListener("input", () => {
    mcqScore.textContent = mcqSlider.value;
    updatePredictedScore();
  });

  document.querySelectorAll(".calc-arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      const frqType = btn.getAttribute("data-frq");
      const idx = btn.getAttribute("data-idx");
      const isUp = btn.classList.contains("calc-arrow-up");
      // Handle Long FRQ
      if (frqType === "long") {
        if (idx === "setall") {
          // Always use longSetAllValue as the source
          let v = longSetAllValue;
          v = clamp(v + (isUp ? 1 : -1), 0, 10);
          longSetAllValue = v;
          longSetAllBox.textContent = `${v}/10`;
          for (let i = 0; i < longScores.length; i++) {
            longScores[i] = v;
            longBoxes[i].textContent = `${v}/10`;
          }
        } else {
          let i = Number(idx);
          let v = longScores[i];
          v = clamp(v + (isUp ? 1 : -1), 0, 10);
          longScores[i] = v;
          longBoxes[i].textContent = `${v}/10`;
          // Update setall value to last changed score
          longSetAllValue = v;
          longSetAllBox.textContent = `${longSetAllValue}/10`;
        }
      }
      // Handle Short FRQ
      if (frqType === "short") {
        if (idx === "setall") {
          let v = shortSetAllValue;
          v = clamp(v + (isUp ? 1 : -1), 0, 4);
          shortSetAllValue = v;
          shortSetAllBox.textContent = `${v}/4`;
          for (let i = 0; i < shortScores.length; i++) {
            shortScores[i] = v;
            shortBoxes[i].textContent = `${v}/4`;
          }
        } else {
          let i = Number(idx);
          let v = shortScores[i];
          v = clamp(v + (isUp ? 1 : -1), 0, 4);
          shortScores[i] = v;
          shortBoxes[i].textContent = `${v}/4`;
          // Update setall value to last changed score
          shortSetAllValue = v;
          shortSetAllBox.textContent = `${shortSetAllValue}/4`;
        }
      }
      updatePredictedScore();
    });
  });

  // SetAll boxes always show a number, never "--/10" or "--/4"
  function syncSetAllBoxes() {
    longSetAllBox.textContent = `${longSetAllValue}/10`;
    shortSetAllBox.textContent = `${shortSetAllValue}/4`;
  }
  setInterval(syncSetAllBoxes, 500);

  function updatePredictedScore() {
    const mcqRaw = Number(mcqSlider.value);
    const mcqPercent = mcqRaw / 60;
    const frqRaw = longScores.reduce((a,b)=>a+b,0) + shortScores.reduce((a,b)=>a+b,0);
    const frqPercent = frqRaw / 52;
    const weightedPercent = 0.5 * mcqPercent + 0.5 * frqPercent;
    let apScore = 1;
    if (weightedPercent >= 0.72) apScore = 5;
    else if (weightedPercent >= 0.60) apScore = 4;
    else if (weightedPercent >= 0.48) apScore = 3;
    else if (weightedPercent >= 0.35) apScore = 2;
    predictedScoreElem.textContent = apScore;
  }
  updatePredictedScore();
}
