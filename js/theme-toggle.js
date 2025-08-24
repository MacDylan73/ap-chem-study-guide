export function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const isDark = body.classList.contains('dark-mode');
  if (isDark) {
    body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
    if (themeIcon) themeIcon.textContent = '🌞';
  } else {
    body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}

export function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  const body = document.body;
  if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    if (document.getElementById('theme-icon')) {
      document.getElementById('theme-icon').textContent = '🌙';
    }
  } else {
    body.classList.remove('dark-mode');
    if (document.getElementById('theme-icon')) {
      document.getElementById('theme-icon').textContent = '🌞';
    }
  }
}
