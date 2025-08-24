export function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
  if (themeIcon) themeIcon.textContent = isDark ? '🌞' : '🌙';
}

export function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  document.body.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light');
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.textContent = savedTheme === 'dark' ? '🌙' : '🌞';
  }
}
