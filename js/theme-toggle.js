function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const isDark = body.classList.toggle('dark-theme');
  // Save Preferences to Local Storage
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '🌞';
}

// Apply Saved Preferences on Page Load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
});
