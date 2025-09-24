// Attach event listeners for topbar.html (CSP compliant)
document.addEventListener('DOMContentLoaded', () => {
  const menuIcon = document.getElementById('menuIcon');
  if (menuIcon && typeof window.toggleSidebar === 'function') {
    menuIcon.addEventListener('click', window.toggleSidebar);
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle && typeof window.toggleTheme === 'function') {
    themeToggle.addEventListener('click', window.toggleTheme);
  }
});
export async function loadTopbar(title = null) {
  const container = document.getElementById("topbar-container");
  if (!container) return;
  try {
  const response = await fetch("/components/topbar.html");
    if (!response.ok) throw new Error("Failed to fetch topbar.html");
    const html = await response.text();
    container.innerHTML = html;
    if (title) {
      const titleElem = container.querySelector('.topbar-title');
      if (titleElem) titleElem.textContent = title;
    }
  } catch (error) {
    container.innerHTML = "<div class='topbar-error'>Topbar failed to load.</div>";
    console.error(error);
  }
}
