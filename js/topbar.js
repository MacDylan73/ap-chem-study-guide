export async function loadTopbar(title = null) {
  const container = document.getElementById("topbar-container");
  if (!container) return;
  try {
    const response = await fetch("/topbar.html");
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
