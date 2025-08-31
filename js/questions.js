import { setupGating } from './gating.js';
import { setSubunitComplete, setFinalQuizComplete, getProgress } from './progress.js';

// Progress tracking for quiz questions per subunit
function checkAnswer(button, isCorrect, explanation) {
  const buttons = button.parentElement.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.classList.remove('correct', 'incorrect');
  });

  button.classList.add(isCorrect ? 'correct' : 'incorrect');

  const feedback = button.parentElement.parentElement.querySelector('.feedback-text');
  feedback.textContent = explanation;

  // Progress tracking addition
  if (isCorrect) {
    // Find the subunit element this question belongs to
    let subunitDiv = button.closest('.subunit');
    if (!subunitDiv) return;
    // Get subunit title for key (header text)
    let subunitHeader = subunitDiv.querySelector('.subunit-header');
    if (!subunitHeader) return;
    let subunitKey = subunitHeader.textContent.trim();

    // Find all question-boxes in subunit
    let questionBoxes = subunitDiv.querySelectorAll('.question-box');
    let questionIds = [];
    questionBoxes.forEach((qbox, idx) => {
      // Each question gets an id: subunitKey + '-' + idx
      qbox.dataset.qid = `${subunitKey}-${idx}`;
      questionIds.push(qbox.dataset.qid);
    });

    // Mark this question as answered correctly
    let thisQid = button.closest('.question-box').dataset.qid;
    // Track progress in memory only (for unsigned users)
    if (!window.isSignedIn || !window.currentUser) {
      // Use in-memory object attached to subunitDiv
      subunitDiv._tempProgress = subunitDiv._tempProgress || {};
      subunitDiv._tempProgress[thisQid] = true;
    }

    // If all questions in subunit answered correctly, mark subunit complete
    let allCorrect = questionIds.every(qid => {
      if (window.isSignedIn && window.currentUser) {
        // For signed-in users, completion handled by Firestore
        return true; // always true, checkmark logic handled elsewhere
      } else {
        // For unsigned users, check in-memory progress
        return subunitDiv._tempProgress && subunitDiv._tempProgress[qid];
      }
    });

    if (allCorrect) {
      if (window.isSignedIn && window.currentUser) {
        const unitId = getCurrentUnitId();
        setSubunitComplete(unitId, subunitKey);
      }
      // For unsigned users, checkmark will show until reload (see below)
    }
    // Update checkmarks (if function exists)
    if (window.updateSubunitCheckmarks) window.updateSubunitCheckmarks();
  }
}

// Quiz checkmarks logic (now in questions.js)
export async function updateSubunitCheckmarks() {
  let progressData = null;

  if (window.isSignedIn && window.currentUser) {
    progressData = await getProgress();
    console.log("[Checkmarks] Firestore progressData:", progressData);
  }

  document.querySelectorAll('.subunit').forEach(subunitDiv => {
    let subunitHeader = subunitDiv.querySelector('.subunit-header');
    if (!subunitHeader) return;
    let subunitKey = subunitHeader.textContent.trim();

    let isComplete = false;
    if (window.isSignedIn && window.currentUser && progressData && progressData.units) {
      const unitId = getCurrentUnitId();
      // Log for debugging
      console.log(`[Checkmarks] Unit: ${unitId}, Subunit: ${subunitKey}, Complete:`, progressData.units[unitId]?.subunits?.[subunitKey]);
      isComplete = !!progressData.units[unitId]?.subunits?.[subunitKey];
    } else if (subunitDiv._tempProgress) {
      // For unsigned users, check in-memory temp progress
      let questionBoxes = subunitDiv.querySelectorAll('.question-box');
      let questionIds = [];
      questionBoxes.forEach((qbox, idx) => {
        qbox.dataset.qid = `${subunitKey}-${idx}`;
        questionIds.push(qbox.dataset.qid);
      });
      isComplete = questionIds.every(qid => subunitDiv._tempProgress[qid]);
    }

    if (isComplete) {
      subunitHeader.classList.add('completed');
    } else {
      subunitHeader.classList.remove('completed');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateSubunitCheckmarks();
  window.updateSubunitCheckmarks = updateSubunitCheckmarks;
});
window.checkAnswer = checkAnswer;

// FINAL QUIZ LOGIC
// Modular Quiz Timer logic for all units
export function setupQuizTimers() {
  document.querySelectorAll('.quiz-box').forEach(quizBox => {
    const timerElem = quizBox.querySelector('.quizTimer');
    const startBtn = quizBox.querySelector('.startQuizBtn');
    const questionsElem = quizBox.querySelector('.quizQuestions');

    quizBox._intervalId = null;
    quizBox._secondsElapsed = 0;

    function formatTime(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    function startTimer() {
      stopTimer();
      quizBox._secondsElapsed = 0;
      timerElem.textContent = `Time: 0:00`;
      quizBox._intervalId = setInterval(() => {
        quizBox._secondsElapsed++;
        timerElem.textContent = `Time: ${formatTime(quizBox._secondsElapsed)}`;
      }, 1000);
    }

    function stopTimer() {
      if (quizBox._intervalId) {
        clearInterval(quizBox._intervalId);
        quizBox._intervalId = null;
      }
    }

    quizBox.startTimer = startTimer;
    quizBox.stopTimer = stopTimer;

    if (startBtn && questionsElem && timerElem) {
      startBtn.onclick = () => {
        // Check gating before starting
        const maxFreeClicks = 3; // or your preferred value!
        let clickCount = parseInt(localStorage.getItem("unitClicks")) || 0;
        const isGated = !window.isSignedIn && clickCount >= maxFreeClicks;

        if (isGated) {
          // Show gating modal instead
          const signupModal = document.getElementById("signupModal");
          if (signupModal) signupModal.style.display = "block";
          return;
        }
        // Otherwise, update click count and start quiz
        clickCount++;
        localStorage.setItem("unitClicks", clickCount);

        startBtn.style.display = "none";
        questionsElem.style.display = "block";
        startTimer();
      };
    }
  });
}

// Call setupQuizTimers() after DOM is loaded
document.addEventListener("DOMContentLoaded", setupQuizTimers);

// Final Quiz Choices+Feedback
// Deferred feedback logic for final quiz boxes only
export function setupFinalQuizLogic() {
  document.querySelectorAll('.final-quiz-box').forEach(quizBox => {
    const questionBoxes = quizBox.querySelectorAll('.question-box');
    const submitBtn = quizBox.querySelector('.final-quiz-submit-btn');
    const scoreElem = quizBox.querySelector('.quizScore');
    const timerElem = quizBox.querySelector('.quizTimer');

    // Timer functions from setupQuizTimers
    const startTimer = quizBox.startTimer || (() => {});
    const stopTimer = quizBox.stopTimer || (() => {});

    function enableSelection() {
      questionBoxes.forEach(qbox => {
        const buttons = qbox.querySelectorAll('.answer-options button');
        const feedbackDiv = qbox.querySelector('.feedback-text');
        qbox.selectedBtn = null;
        buttons.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove('selected', 'correct', 'incorrect');
          btn.onclick = () => {
            if (submitBtn.disabled) return;
            buttons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            qbox.selectedBtn = btn;
            feedbackDiv.textContent = "";
          };
        });
        feedbackDiv.textContent = "";
      });
    }
    enableSelection();

    function resetQuiz() {
      // Stop timer and reset text
      stopTimer();
      if (timerElem) timerElem.textContent = "Time: 0:00";
      // Clear selection, highlighting, feedback
      questionBoxes.forEach(qbox => {
        const buttons = qbox.querySelectorAll('.answer-options button');
        buttons.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove('selected', 'correct', 'incorrect');
        });
        qbox.selectedBtn = null;
        const feedbackDiv = qbox.querySelector('.feedback-text');
        feedbackDiv.textContent = "";
      });
      // Hide score
      if (scoreElem) {
        scoreElem.textContent = "";
        scoreElem.style.display = "none";
      }
      // Re-enable submit
      submitBtn.textContent = "Submit Quiz";
      submitBtn.disabled = false;
      submitBtn.onclick = submitHandler;
      enableSelection();
      // Start timer again
      startTimer();
    }

    function submitHandler() {
      submitBtn.disabled = true;
      stopTimer(); // Stop when submitting

      let correctCount = 0;
      let totalQuestions = questionBoxes.length;

      questionBoxes.forEach(qbox => {
        const buttons = qbox.querySelectorAll('.answer-options button');
        const feedbackDiv = qbox.querySelector('.feedback-text');
        buttons.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));

        const selectedBtn = qbox.selectedBtn;
        if (!selectedBtn) {
          feedbackDiv.textContent = "No answer selected.";
          return;
        }
        const isCorrect = selectedBtn.dataset.correct === "true";
        feedbackDiv.textContent = selectedBtn.dataset.explanation ?? "";
        if (isCorrect) {
          selectedBtn.classList.add('correct');
          correctCount++;
        } else {
          selectedBtn.classList.add('incorrect');
        }
      });

      // Show score below timer
      if (scoreElem) {
        scoreElem.textContent = `Score: ${correctCount} out of ${totalQuestions} correct`;
        scoreElem.style.display = "block";
      }

      // Change button to "Try Again"
      submitBtn.textContent = "Try Again";
      submitBtn.disabled = false;
      submitBtn.onclick = resetQuiz;

      // Disable answer selection until retry
      questionBoxes.forEach(qbox => {
        qbox.querySelectorAll('.answer-options button').forEach(btn => btn.disabled = true);
      });

      // ---- Save Percent/Completion ----
      const percent = Math.round((correctCount / totalQuestions) * 100);

      // Only save progress if user is signed in
      if (window.isSignedIn && window.currentUser) {
        const unitId = getCurrentUnitId();
        setFinalQuizComplete(unitId, percent);
      }
      // For guests, nothing is stored
    }

    // Attach handler (outside the function, after DOM ready)
    if (submitBtn) {
      submitBtn.onclick = submitHandler;
    }
  });
}

// Get Unit ID for saving
function getCurrentUnitId() {
  // Example: Use document title, a meta tag, or the URL to infer unit
  // If you use a meta tag:
  const meta = document.querySelector('meta[name="unit-id"]');
  if (meta) return meta.content;

  // Or infer from page title:
  if (document.title && document.title.startsWith("Unit")) {
    // e.g. "Unit 1: Atomic Structure" -> "unit-1"
    const match = document.title.match(/Unit\s*(\d+)/i);
    if (match) return `unit-${match[1]}`;
  }

  // Or fallback to a hardcoded value if needed
  // return "unit-1";
}

document.addEventListener('DOMContentLoaded', setupFinalQuizLogic);
