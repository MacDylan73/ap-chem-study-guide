// Toggle for subunit dropdowns
document.querySelectorAll('.subunit-header').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
    });
});

// Toggle for sidebar menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.transform = sidebar.style.transform === 'translateX(0%)' ? 'translateX(-100%)' : 'translateX(0%)';
}

//Themes
// Toggle Light/Dark Mode Themes

function toggleTheme() {
  const body = document.body;
  body.classList.toggle('dark-mode');
  const icon = document.getElementById('theme-icon');
  const isDark = body.classList.contains('dark-mode');
  icon.textContent = isDark ? '🌙' : '🌞';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Theme set on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-icon').textContent = '🌙';
  }
});

