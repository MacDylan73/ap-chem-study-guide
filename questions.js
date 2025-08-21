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
