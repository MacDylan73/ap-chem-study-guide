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
   // --------- Leaderboard Logic ----------
    function setupLeaderboardTabs() {
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

    async function loadLeaderboard(metric) {
      const leaderboardTable = document.getElementById('leaderboardTable');
      const tbody = leaderboardTable.querySelector('tbody');
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Loading...</td></tr>';

      // Fetch all attempts
      let attemptsSnap;
      try {
        attemptsSnap = await db.collection("qotd_attempts").get();
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center">${err.message}</td></tr>`;
        return;
      }

      // Aggregate stats by user
      const stats = {}; // uid -> { correct, attempted, streak, username }
      attemptsSnap.forEach(doc => {
        const d = doc.data();
        if (!stats[d.uid]) stats[d.uid] = { correct: 0, attempted: 0, streak: 0, bestStreak: 0, dates: [], username: null };
        stats[d.uid].attempted++;
        if (d.correct) stats[d.uid].correct++;
        stats[d.uid].dates.push(d.date);
      });

      // Compute streaks and percent correct
      for (const [uid, data] of Object.entries(stats)) {
        // Compute best streak
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

      // Get usernames
      for (const uid of Object.keys(stats)) {
        try {
          const userDoc = await db.collection("users").doc(uid).get();
          stats[uid].username = userDoc.exists ? (userDoc.data().username || uid) : uid;
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

    // --------- Stats Box Logic ----------
    async function updateStatsBox() {
      const user = auth.currentUser;
      const statsBox = document.getElementById('qotdStatsBox');
      // If not signed in
      if (!user) {
        document.getElementById('userTotalCorrect').textContent = "--";
        document.getElementById('userStreak').textContent = "--";
        document.getElementById('userBestStreak').textContent = "--";
        document.getElementById('userPercentCorrect').textContent = "--";
        return;
      }
      // Get attempts
      const attemptsSnap = await db.collection("qotd_attempts").where("uid", "==", user.uid).get();
      let totalCorrect = 0, totalAttempted = 0, bestStreak = 0, streak = 0, prevDate = null;
      const dates = [];
      attemptsSnap.forEach(doc => {
        const data = doc.data();
        if (data.correct) totalCorrect++;
        totalAttempted++;
        dates.push(data.date);
      });
      // Streak computation
      const sortedDates = dates.filter(Boolean).sort();
      for (const dateStr of sortedDates) {
        if (!prevDate) streak = 1;
        else {
          const prev = new Date(prevDate);
          const curr = new Date(dateStr);
          const diff = (curr - prev) / (1000*60*60*24);
          if (diff === 1) streak++;
          else streak = 1;
        }
        prevDate = dateStr;
        if (streak > bestStreak) bestStreak = streak;
      }
      // Percent
      const percent = totalAttempted > 0 ? (100 * totalCorrect / totalAttempted) : 0;
      document.getElementById('userTotalCorrect').textContent = totalCorrect;
      document.getElementById('userStreak').textContent = streak;
      document.getElementById('userBestStreak').textContent = bestStreak;
      document.getElementById('userPercentCorrect').textContent = percent.toFixed(1) + "%";
    }

    // --------- Streak Fire Icon Logic ----------
    async function updateStreakIcon() {
      const user = auth.currentUser;
      const qotdStreak = document.getElementById('qotdStreak');
      const streakTooltip = document.getElementById('streakTooltip');
      if (!qotdStreak || !streakTooltip) return;

      if (!user) {
        qotdStreak.innerHTML = `<span class="streak-number">0</span> <span class="fire-icon">🔥</span>`;
        return;
      }
      // Get attempts
      const attemptsSnap = await db.collection("qotd_attempts").where("uid", "==", user.uid).get();
      let streak = 0, prevDate = null, currentStreak = 0, yesterdayStreak = 0;
      const todayStr = (new Date()).toISOString().slice(0, 10);
      const yesterdayStr = (() => {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return now.toISOString().slice(0, 10);
      })();
      const attempts = [];
      attemptsSnap.forEach(doc => attempts.push(doc.data()));
      attempts.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < attempts.length; ++i) {
        if (!attempts[i].correct) {
          streak = 0;
          prevDate = attempts[i].date;
          continue;
        }
        const thisDate = attempts[i].date;
        if (prevDate) {
          const prev = new Date(prevDate);
          const curr = new Date(thisDate);
          const daysDiff = (curr - prev) / (1000*60*60*24);
          if (daysDiff === 1) streak++;
          else streak = 1;
        } else {
          streak = 1;
        }
        prevDate = thisDate;
        if (thisDate === yesterdayStr) {
          yesterdayStreak = streak;
        }
      }
      // Use streak for today if answered correctly, else up to yesterday
      if (
        attempts.length &&
        attempts[attempts.length - 1].date === todayStr &&
        attempts[attempts.length - 1].correct
      ) {
        currentStreak = streak;
      } else {
        currentStreak = yesterdayStreak;
      }
      qotdStreak.innerHTML = `<span class="streak-number">${currentStreak}</span> <span class="fire-icon" tabindex="0" style="cursor:pointer;">🔥</span>`;
      const fireIcon = qotdStreak.querySelector('.fire-icon');
      function showStreakTooltip() {
        streakTooltip.textContent = `Current Streak: ${currentStreak}`;
        streakTooltip.style.display = 'block';
        streakTooltip.style.opacity = '1';
      }
      function hideStreakTooltip() {
        streakTooltip.style.display = 'none';
        streakTooltip.style.opacity = '0';
      }
      if (fireIcon) {
        fireIcon.addEventListener('mouseenter', showStreakTooltip);
        fireIcon.addEventListener('mouseleave', hideStreakTooltip);
        fireIcon.addEventListener('focus', showStreakTooltip);
        fireIcon.addEventListener('blur', hideStreakTooltip);
        fireIcon.addEventListener('click', function (e) {
          showStreakTooltip();
          setTimeout(hideStreakTooltip, 1200);
        });
        fireIcon.addEventListener('touchstart', function (e) {
          showStreakTooltip();
          setTimeout(hideStreakTooltip, 1200);
        });
      }
    }
}
