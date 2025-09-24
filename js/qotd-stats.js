// qotd-stats.js -- Modal open/close logic for QOTD Stats & Leaderboard

document.getElementById('openStatsModalBtn').onclick = () => {
  document.getElementById('userStatsModal').style.display = 'flex';
};
document.getElementById('closeStatsModalBtn').onclick = () => {
  document.getElementById('userStatsModal').style.display = 'none';
};
document.getElementById('openLeaderboardModalBtn').onclick = () => {
  document.getElementById('leaderboardModal').style.display = 'flex';
};
document.getElementById('closeLeaderboardModalBtn').onclick = () => {
  document.getElementById('leaderboardModal').style.display = 'none';
};
// Optional: Close modal on background click

document.getElementById('userStatsModal').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};
document.getElementById('leaderboardModal').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};

// ESC key closes either modal if open

document.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    const statsModal = document.getElementById('userStatsModal');
    const leaderboardModal = document.getElementById('leaderboardModal');
    if (statsModal.style.display === 'flex') statsModal.style.display = 'none';
    if (leaderboardModal.style.display === 'flex') leaderboardModal.style.display = 'none';
  }
});
