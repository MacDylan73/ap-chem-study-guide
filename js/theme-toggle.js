export function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const isDark = body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '🌞';
}

// Apply Saved Preferences on Page Load
export function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  // Always update icon
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.textContent = document.body.classList.contains('dark-mode') ? '🌙' : '🌞';
  }
}
