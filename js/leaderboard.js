// leaderboard.js

// Move all imports to the top of the file!
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// Tab setup expects a callback that takes a metric and loads leaderboard with that metric
export function setupLeaderboardTabs(loadLeaderboardCallback) {
  const tabTotal = document.getElementById('tabTotalCorrect');
  const tabStreak = document.getElementById('tabStreak');
  const tabPercent = document.getElementById('tabPercentCorrect');
  const metricHeader = document.getElementById('leaderboardMetricHeader');
  tabTotal.addEventListener('click', () => {
    tabTotal.classList.add('active');
    tabStreak.classList.remove('active');
    tabPercent.classList.remove('active');
    metricHeader.textContent = "Total Correct";
    loadLeaderboardCallback("total");
  });
  tabStreak.addEventListener('click', () => {
    tabTotal.classList.remove('active');
    tabStreak.classList.add('active');
    tabPercent.classList.remove('active');
    metricHeader.textContent = "Best Streak";
    loadLeaderboardCallback("streak");
  });
  tabPercent.addEventListener('click', () => {
    tabTotal.classList.remove('active');
    tabStreak.classList.remove('active');
    tabPercent.classList.add('active');
    metricHeader.textContent = "% Correct";
    loadLeaderboardCallback("percent");
  });
}

// Main leaderboard loader, uses Firestore modular API
export async function loadLeaderboard(metric, db) {
  const leaderboardTable = document.getElementById('leaderboardTable');
  const tbody = leaderboardTable.querySelector('tbody');
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Loading...</td></tr>';

  // Fetch all attempts
  let attemptsSnap;
  try {
    attemptsSnap = await getDocs(collection(db, "qotd_attempts"));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center">Please sign in to view the leaderboard</td></tr>`;
    return;
  }

  // Aggregate stats by user
  const stats = {}; // uid -> { correct, attempted, streak, bestStreak, dates, username }
  attemptsSnap.forEach(doc => {
    const d = doc.data();
    if (!stats[d.uid]) stats[d.uid] = { correct: 0, attempted: 0, bestStreak: 0, dates: [], username: null };
    stats[d.uid].attempted++;
    if (d.correct) stats[d.uid].correct++;
    stats[d.uid].dates.push(d.date);
  });

  // Compute best streak and percent correct
  for (const [uid, data] of Object.entries(stats)) {
    const datesSorted = data.dates.filter(Boolean).sort();
    let streak = 0, bestStreak = 0, prevDate = null;
    for (const dateStr of datesSorted) {
      if (!prevDate) {
        streak = 1;
      } else {
        const prev = new Date(prevDate);
        const curr = new Date(dateStr);
        const diff = (curr - prev) / (1000*60*60*24);
        if (diff === 1) streak++;
        else streak = 1;
      }
      prevDate = dateStr;
      if (streak > bestStreak) bestStreak = streak;
    }
    data.bestStreak = bestStreak;
    data.percent = data.attempted > 0 ? (100 * data.correct / data.attempted) : 0;
  }

  // Get usernames from users collection
  for (const uid of Object.keys(stats)) {
    try {
      const userDocSnap = await getDoc(doc(db, "users", uid));
      stats[uid].username = userDocSnap.exists() ? (userDocSnap.data().username || uid) : uid;
    } catch {
      stats[uid].username = uid;
    }
  }

  // Sort and render leaderboard
  let sorted;
  if (metric === "total") sorted = Object.entries(stats).sort((a, b) => b[1].correct - a[1].correct);
  else if (metric === "streak") sorted = Object.entries(stats).sort((a, b) => b[1].bestStreak - a[1].bestStreak);
  else sorted = Object.entries(stats).sort((a, b) => b[1].percent - a[1].percent);

  tbody.innerHTML = "";
  sorted.slice(0, 15).forEach(([uid, data], i) => {
    let value;
    if (metric === "total") value = data.correct;
    else if (metric === "streak") value = data.bestStreak;
    else value = `${data.percent.toFixed(1)}%`;
    tbody.innerHTML += `<tr>
      <td>${i+1}</td>
      <td>${data.username}</td>
      <td>${value}</td>
    </tr>`;
  });
  if (tbody.innerHTML === "") {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">No leaderboard data.</td></tr>`;
  }
}
