function checkAnswer(choice) {
  const box = document.getElementById('questionBox');
  if (choice === 'electron') {
    box.classList.add('correct');
    box.classList.remove('incorrect');
  } else {
    box.classList.add('incorrect');
    box.classList.remove('correct');
  }
}
