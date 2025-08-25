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
    let progressKey = 'progress_' + subunitKey;
    let progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    progress[thisQid] = true;
    localStorage.setItem(progressKey, JSON.stringify(progress));

    // If all questions in subunit answered correctly, mark subunit complete
    let allCorrect = questionIds.every(qid => progress[qid]);
    if (allCorrect) {
      localStorage.setItem('quizComplete_' + subunitKey, 'true');
    }
    // Update checkmarks (if function exists)
    if (window.updateSubunitCheckmarks) window.updateSubunitCheckmarks();
  }
}


// Quiz checkmarks logic (now in questions.js)
export function updateSubunitCheckmarks() {
  document.querySelectorAll('.subunit').forEach(subunitDiv => {
    let subunitHeader = subunitDiv.querySelector('.subunit-header');
    if (!subunitHeader) return;
    let subunitKey = subunitHeader.textContent.trim();
    let isComplete = localStorage.getItem('quizComplete_' + subunitKey) === 'true';
    if (isComplete) {
      subunitHeader.classList.add('completed');
    } else {
      subunitHeader.classList.remove('completed');
    }
  });
}

// Optionally, set this up automatically on DOMContentLoaded
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

    let intervalId;
    let secondsElapsed = 0;

    function formatTime(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    function startTimer() {
      secondsElapsed = 0;
      timerElem.textContent = `Time: 0:00`;
      intervalId = setInterval(() => {
        secondsElapsed++;
        timerElem.textContent = `Time: ${formatTime(secondsElapsed)}`;
      }, 1000);
    }

    function stopTimer() {
      clearInterval(intervalId);
    }

    // Attach stopTimer to quizBox so other logic can call it
    quizBox.stopTimer = stopTimer;

    if (startBtn && questionsElem && timerElem) {
      startBtn.onclick = () => {
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

    // For each question, handle answer selection (save selection but don't show feedback yet)
    questionBoxes.forEach(qbox => {
      const buttons = qbox.querySelectorAll('.answer-options button');
      const feedbackDiv = qbox.querySelector('.feedback-text');
      qbox.selectedBtn = null;

      buttons.forEach(btn => {
        btn.onclick = () => {
          if (submitBtn.disabled) return; // Prevent selection after submit
          buttons.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');  // Neutral highlight
          qbox.selectedBtn = btn;
          feedbackDiv.textContent = "";
        };
      });
    });

    if (submitBtn) {
      submitBtn.onclick = () => {
        submitBtn.disabled = true;

        // STOP THE TIMER for this quiz box!
        if (typeof quizBox.stopTimer === 'function') {
          quizBox.stopTimer();
        }

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
      };
    }
  });
}
document.addEventListener('DOMContentLoaded', setupFinalQuizLogic);
