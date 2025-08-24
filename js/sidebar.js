// Sidebar Toggle (uses .visible class as in your CSS)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('visible');
  }
}
window.toggleSidebar = toggleSidebar;

// Highlight the active sidebar link for the current page
function highlightActiveSidebarLink() {
  // Normalize pathname for root to index.html
  let current = window.location.pathname;
  if (current.endsWith('/')) current += 'index.html';

  document.querySelectorAll('.sidebar a').forEach(link => {
    let linkPath = new URL(link.href, window.location.origin).pathname;
    if (linkPath.endsWith('/')) linkPath += 'index.html';
    if (linkPath === current) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// If sidebar is dynamically loaded, run after it's in the DOM
document.addEventListener('DOMContentLoaded', highlightActiveSidebarLink);
// When loading sidebar call highlightActiveSidebarLink() after inserting sidebar HTML

// Auto-close sidebar when clicking outside
document.addEventListener('click', function (event) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleButton = document.querySelector('.menu-icon');

  if (!sidebar || !overlay) return;
  const clickedInsideSidebar = sidebar.contains(event.target);
  const clickedToggleButton = toggleButton && toggleButton.contains(event.target);
  const clickedOverlay = overlay.contains(event.target);

  if (!clickedInsideSidebar && !clickedToggleButton && !clickedOverlay) {
    sidebar.classList.remove('visible');
  }
});

// Auto-close sidebar when clicking overlay
document.addEventListener('DOMContentLoaded', function () {
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', function () {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('visible');
    });
  }
});

// Auto-close sidebar when pressing Escape
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('visible');
  }
});

// Load Sidebar
export async function loadSidebar() {
  const resp = await fetch('sidebar.html');
  const html = await resp.text();
  document.getElementById('sidebar-container').innerHTML = html;
}
