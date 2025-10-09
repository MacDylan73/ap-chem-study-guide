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
  // Get current path
  const currentPath = window.location.pathname.replace(/\\+/g, '/');
  document.querySelectorAll('.sidebar a').forEach(link => {
    let linkHref = link.getAttribute('href');
    if (!linkHref) return;
    // If absolute, compare full path
    if (linkHref.startsWith('/')) {
      if (currentPath === linkHref || currentPath.startsWith(linkHref + '/')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    } else {
      // Relative: compare filename
      let linkPage = linkHref.split('/').pop().split('?')[0].split('#')[0];
      let currentPage = currentPath.split('/').pop().split('?')[0].split('#')[0];
      if (linkPage === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
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
  // Get current path and page
  const path = window.location.pathname;
  const currentPage = path.split('/').pop();
  const sidebarContainer = document.getElementById('sidebar-container');
  // Root index page (Course Hub)
  if (path === '/' || currentPage === 'index.html') {
    sidebarContainer.innerHTML = `
      <div id="sidebar" class="sidebar">
        <div class="sidebar-header">AP Prep Hub<hr></div>
        <nav class="sidebar-links">
          <a href="/" class="active" style="display:block; margin-bottom:0.8em;">🏠 AP Prep Hub</a>
          <a href="/ap-chem/course-guide/">AP Chemistry</a>
        </nav>
        <div class="sidebar-footer" style="margin-top:2.5em; font-size:0.93em; color:#8a8a8a; text-align:center;">
          Want more AP courses or have feedback? Please reach out to me on the page below! 
          <a href="/about/index.html" style="color:#6c7a89;text-decoration:underline;">Contact</a>
        </div>
      </div>
      <div id="sidebar-overlay" class="sidebar-overlay"></div>
    `;
    // No need to call highlightActiveSidebarLink here since AP Prep Hub is always active on root
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('visible');
      });
    }
    return;
  }
  // AP Chem pages (any page under /ap-chem/)
  if (path.startsWith('/ap-chem/')) {
    // Fetch sidebar.html from components folder with error handling
    try {
      const resp = await fetch('/components/sidebar.html');
      if (!resp.ok) throw new Error('Sidebar HTML not found');
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
    } catch (err) {
      sidebarContainer.innerHTML = `<div id="sidebar" class="sidebar"><div class="sidebar-header">AP Prep Hub<hr></div><nav class="sidebar-links"><a href="/">🏠 AP Prep Hub</a></nav><div class="sidebar-footer" style="margin-top:2.5em; font-size:0.93em; color:#8a8a8a; text-align:center;">Sidebar failed to load. <br> <span style='color:#d12e2e;'>${err.message}</span></div></div><div id="sidebar-overlay" class="sidebar-overlay"></div>`;
    }
    return;
  }
  // Fallback: show only link to home and contact
  sidebarContainer.innerHTML = `
    <div id="sidebar" class="sidebar">
      <div class="sidebar-header">AP Prep Hub<hr></div>
      <nav class="sidebar-links">
        <a href="/">🏠 AP Prep Hub</a>
      </nav>
      <div class="sidebar-footer" style="margin-top:2.5em; font-size:0.93em; color:#8a8a8a; text-align:center;">
        Want more AP courses or have feedback? Please reach out to me on the page below! 
        <a href="/about/index.html" style="color:#6c7a89;text-decoration:underline;">Contact</a>
      </div>
    </div>
    <div id="sidebar-overlay" class="sidebar-overlay"></div>
  `;
  highlightActiveSidebarLink();
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', function () {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('visible');
    });
  }
}
