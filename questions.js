function checkAnswer(element, isCorrect, explanation) {
  const choices = element.parentElement.querySelectorAll('li');
  choices.forEach(choice => {
    choice.onclick = null; // disable further clicks
    choice.classList.remove('correct', 'incorrect');
  });

  element.classList.add(isCorrect ? 'correct' : 'incorrect');

  const feedbackBox = element.parentElement.parentElement.querySelector('.feedback');
  feedbackBox.textContent = explanation;
}
