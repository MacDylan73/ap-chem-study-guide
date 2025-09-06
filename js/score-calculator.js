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

        // OPTION 2: Inject link only on index page (or where you want)
        // You can check via pathname, or look for a unique element/class on the index page
        // Example: Only add if on index.html
        if (
          window.location.pathname.endsWith("index.html") ||
          window.location.pathname === "/" // also home
        ) {
          const scoreResult = container.querySelector(".calc-score-result");
          if (scoreResult) {
            const linkDiv = document.createElement("div");
            linkDiv.className = "calc-full-link";
            linkDiv.innerHTML = '<a href="ap-chem-score-calculator.html" target="_blank">Go to full score calculator page →</a>';
            scoreResult.appendChild(linkDiv);
          }
        }
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

  // Initialize MCQ to 30 (middle)
  mcqSlider.value = 30;
  mcqScore.textContent = mcqSlider.value;

  // Long FRQ
  const longScores = [5, 5, 5]; // initialize to 50%
  const longBoxes = [
    document.getElementById("frq-long-0"),
    document.getElementById("frq-long-1"),
    document.getElementById("frq-long-2")
  ];
  const longSetAllBox = document.getElementById("frq-long-setall");
  let longSetAllValue = 5; // always number, starts at 5

  // Initialize UI for Long FRQs
  for (let i = 0; i < longScores.length; i++) {
    longBoxes[i].textContent = `${longScores[i]}/10`;
  }
  longSetAllBox.textContent = `${longSetAllValue}/10`;

  // Short FRQ
  const shortScores = [2, 2, 2, 2]; // initialize to 50%
  const shortBoxes = [
    document.getElementById("frq-short-0"),
    document.getElementById("frq-short-1"),
    document.getElementById("frq-short-2"),
    document.getElementById("frq-short-3")
  ];
  const shortSetAllBox = document.getElementById("frq-short-setall");
  let shortSetAllValue = 2; // always number, starts at 2

  // Initialize UI for Short FRQs
  for (let i = 0; i < shortScores.length; i++) {
    shortBoxes[i].textContent = `${shortScores[i]}/4`;
  }
  shortSetAllBox.textContent = `${shortSetAllValue}/4`;

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
          // Only change longSetAllValue on its own arrow click
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
          // Do NOT update longSetAllValue or box
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
          // Do NOT update shortSetAllValue or box
        }
      }
      updatePredictedScore();
    });
  });

  // SetAll boxes always show their current value
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
