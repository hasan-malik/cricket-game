// scorecard.js — scorecard panel (pause + game over)

const sr = (runs, balls) =>
  balls === 0 ? "–" : ((runs / balls) * 100).toFixed(1);

function resultBanner(r) {
  if (!r) return "";
  let label, sub, color;
  if (r.type === "win") {
    const b = r.ballsLeft, w = r.wicketsLeft;
    label = "Victory";
    sub   = `Target chased with ${w} wicket${w !== 1 ? "s" : ""} and ${b} ball${b !== 1 ? "s" : ""} to spare`;
    color = "var(--accent)";
  } else if (r.type === "tie") {
    label = "Tied";
    sub   = `Scores level at ${GAME.otherTeamScore}`;
    color = "#ffe58a";
  } else {
    label = r.allOut ? "All out" : "Innings over";
    sub   = `Fell short by ${r.runsShort} run${r.runsShort !== 1 ? "s" : ""}`;
    color = "#ff9d9d";
  }
  return `<div class="result-banner" style="--result-color:${color}">` +
    `<span class="result-title">${label}</span>` +
    `<span class="result-sub">${sub}</span>` +
  `</div>`;
}

function showScorecardPanel(result = null) {
  const rows = TEAM.players.map((p, i) => {
    const isOut     = GAME.battedOut[i];
    const isStriker = i === GAME.strikerIdx;
    const hasBatted = isOut || i === GAME.strikerIdx || i === GAME.nonStrikerIdx;

    if (!hasBatted) {
      return `<tr class="sc-row sc-dnb">` +
        `<td class="sc-name">${escapeHtml(p.name)}</td>` +
        `<td class="sc-num">–</td><td class="sc-num">–</td>` +
        `<td class="sc-num">–</td><td class="sc-num">–</td><td class="sc-num">–</td>` +
      `</tr>`;
    }

    return `<tr class="sc-row${isOut ? " sc-out" : ""}">` +
      `<td class="sc-name">` +
        `${escapeHtml(p.name)}` +
        (isOut             ? `<span class="sc-badge-out">out</span>` : "") +
        (isStriker && !isOut ? `<span class="sc-striker-mark">*</span>` : "") +
      `</td>` +
      `<td class="sc-num">${GAME.batterRuns[i]}</td>` +
      `<td class="sc-num sc-muted">${GAME.batterBalls[i]}</td>` +
      `<td class="sc-num sc-muted">${GAME.batterFours[i]}</td>` +
      `<td class="sc-num sc-muted">${GAME.batterSixes[i]}</td>` +
      `<td class="sc-num">${sr(GAME.batterRuns[i], GAME.batterBalls[i])}</td>` +
    `</tr>`;
  }).join("");

  const actionBtn = result
    ? `<button id="restartBtn">Play again</button>`
    : `<button id="resumeBtn">▶ Resume</button>`;

  _panel.innerHTML =
    resultBanner(result) +
    `<h2>Scorecard</h2>` +
    `<table class="sc-table">` +
      `<thead><tr>` +
        `<th class="sc-th-name">Batsman</th>` +
        `<th class="sc-th-num">R</th>` +
        `<th class="sc-th-num">B</th>` +
        `<th class="sc-th-num">4s</th>` +
        `<th class="sc-th-num">6s</th>` +
        `<th class="sc-th-num">SR</th>` +
      `</tr></thead>` +
      `<tbody>${rows}</tbody>` +
    `</table>` +
    `<div class="sc-totals">` +
      `<span>${GAME.score} / ${GAME.wickets}</span>` +
      `<span class="sc-totals-meta">${toOvers(GAME.balls)} ov &nbsp;·&nbsp; chasing ${GAME.otherTeamScore}/${GAME.otherTeamWickets}</span>` +
    `</div>` +
    actionBtn;
}
