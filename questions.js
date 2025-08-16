function checkAnswer(button, isCorrect, explanation) {
  const buttons = button.parentElement.querySelectorAll('button');
  buttons.forEach(btn => {
    //btn.disabled = true;
    btn.classList.remove('correct', 'incorrect');
  });

  button.classList.add(isCorrect ? 'correct' : 'incorrect');

  const feedback = button.parentElement.parentElement.querySelector('.feedback-text');
  feedback.textContent = explanation;
}
