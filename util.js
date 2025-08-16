//Dropdowns ------------------------------
// Toggle for subunit dropdowns
document.querySelectorAll('.subunit-header').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
    });
});

// SIDEBAR --------------------------------
// Toggle for sidebar menu
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('visible');
}

// Auto-close sidebar when clicking outside
document.addEventListener('click', function (event) {
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.getElementById('menuToggle'); // update this ID if needed

  const clickedInsideSidebar = sidebar.contains(event.target);
  const clickedToggleButton = toggleButton && toggleButton.contains(event.target);

  if (!clickedInsideSidebar && !clickedToggleButton) {
    sidebar.classList.remove('visible');
  }
});

//Auto-Close sidebar when click esc
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    document.getElementById('sidebar').classList.remove('visible');
  }
});


// THEMES ---------------------------------
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

