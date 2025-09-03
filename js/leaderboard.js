export function setupLeaderboardTabs() {
  const tabTotal = document.getElementById('tabTotalCorrect');
  const tabStreak = document.getElementById('tabStreak');
  const tabPercent = document.getElementById('tabPercentCorrect');
  const metricHeader = document.getElementById('leaderboardMetricHeader');
  tabTotal.addEventListener('click', () => {
    tabTotal.classList.add('active');
    tabStreak.classList.remove('active');
    tabPercent.classList.remove('active');
    metricHeader.textContent = "Total Correct";
    loadLeaderboard("total");
  });
  tabStreak.addEventListener('click', () => {
    tabTotal.classList.remove('active');
    tabStreak.classList.add('active');
    tabPercent.classList.remove('active');
    metricHeader.textContent = "Best Streak";
    loadLeaderboard("streak");
  });
  tabPercent.addEventListener('click', () => {
    tabTotal.classList.remove('active');
    tabStreak.classList.remove('active');
    tabPercent.classList.add('active');
    metricHeader.textContent = "% Correct";
    loadLeaderboard("percent");
  });
}

export async function loadLeaderboard(metric) {
  // ...copy all your leaderboard logic here...
}
