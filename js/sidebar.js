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
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar a').forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

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

// Load Sidebar (dynamic for homepage)
export async function loadSidebar() {
  // Get current page ('' for '/', or e.g. 'index.html')
  const currentPage = window.location.pathname.split('/').pop();
  const rootPages = ['', 'index.html'];
  const sidebarContainer = document.getElementById('sidebar-container');
  // If on root page, show course homepage links and the greyed-out message
  if (rootPages.includes(currentPage)) {
    sidebarContainer.innerHTML = `
      <div id="sidebar" class="sidebar">
        <div class="sidebar-header">Courses</div>
        <nav class="sidebar-links">
          <a href="ap-chem-course-guide.html">AP Chemistry</a>
        </nav>
        <div class="sidebar-footer" style="margin-top:2.5em; font-size:0.93em; color:#8a8a8a; text-align:center;">
          Want more AP courses? 
          <a href="about.html" style="color:#6c7a89;text-decoration:underline;">Reach out</a>
          and let me know what you are taking!
        </div>
      </div>
      <div id="sidebar-overlay" class="sidebar-overlay"></div>
    `;
    highlightActiveSidebarLink();
    // Attach overlay click handler
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('visible');
      });
    }
  } else {
    // Otherwise, load sidebar.html as before
    const resp = await fetch('sidebar.html');
    const html = await resp.text();
    sidebarContainer.innerHTML = html;
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('visible');
      });
    }
    highlightActiveSidebarLink();
  }
}
