// Sidebar Toggle (uses .visible class as in your CSS)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('visible');
  }
}

// Highlight the active sidebar link for the current page
function highlightActiveSidebarLink() {
  document.querySelectorAll('.sidebar a').forEach(link => {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });
}

// If sidebar is dynamically loaded, run after it's in the DOM
document.addEventListener('DOMContentLoaded', highlightActiveSidebarLink);
// When loading sidebar call highlightActiveSidebarLink() after inserting sidebar HTML
