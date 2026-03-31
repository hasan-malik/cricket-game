// scorecard.js — pause-screen scorecard panel

function showScorecardPanel() {
  const panel   = document.querySelector("#overlay .panel");
  const toOvers = b => `${Math.floor(b / 6)}.${b % 6}`;
  const sr      = (runs, balls) =>
    balls === 0 ? "–" : ((runs / balls) * 100).toFixed(1);

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
        (isOut    ? `<span class="sc-badge-out">out</span>` : "") +
        (isStriker && !isOut ? `<span class="sc-striker-mark">*</span>` : "") +
      `</td>` +
      `<td class="sc-num">${GAME.batterRuns[i]}</td>` +
      `<td class="sc-num sc-muted">${GAME.batterBalls[i]}</td>` +
      `<td class="sc-num sc-muted">${GAME.batterFours[i]}</td>` +
      `<td class="sc-num sc-muted">${GAME.batterSixes[i]}</td>` +
      `<td class="sc-num">${sr(GAME.batterRuns[i], GAME.batterBalls[i])}</td>` +
    `</tr>`;
  }).join("");

  panel.innerHTML =
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
      `<span class="sc-totals-meta">${toOvers(GAME.balls)} ov &nbsp;·&nbsp; target ${GAME.target}</span>` +
    `</div>` +
    `<button id="resumeBtn">▶ Resume</button>`;
}
