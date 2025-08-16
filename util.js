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

// Toggle Light/Dark Mode Themes
  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('theme-icon');
    icon.textContent = document.body.classList.contains('dark-mode') ? '🌙' : '🌞';
  }
