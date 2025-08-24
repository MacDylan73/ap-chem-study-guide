// Load Topbar
export async function loadTopbar() {
  const container = document.getElementById("topbar-container");
  if (!container) return;
  try {
    const response = await fetch("topbar.html");
    if (!response.ok) throw new Error("Failed to fetch topbar.html");
    const html = await response.text();
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = "<div class='topbar-error'>Topbar failed to load.</div>";
    console.error(error);
  }
}

// Changes Top Bar Title Dynamically for each Page
export function setTopbarTitle(title) {
  document.querySelector('.topbar-title').textContent = title;
}
