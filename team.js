// team.js — team roster data & batting-order panel UI

const TEAM = {
  players: [
    { name: "Tendulkar" },
    { name: "Ponting" },
    { name: "de Villiers" },
    { name: "Richards" },
    { name: "Imran" },
  ],
};

// Snapshot intro panel HTML once at load; restored when returning from team view.
const _panel = document.querySelector("#overlay .panel");
const _introPanelHTML = _panel.innerHTML;

function toOvers(b) { return `${Math.floor(b / 6)}.${b % 6}`; }

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showIntroPanel() {
  _panel.innerHTML = _introPanelHTML;
}

function showTeamPanel() {
  _panel.innerHTML =
    `<h2>Batting order</h2>` +
    `<p>Tap a name to edit it.</p>` +
    `<div class="team-list">` +
    TEAM.players.map((p, i) =>
      `<div class="team-row" data-idx="${i}">` +
        `<span class="batting-order">${i + 1}</span>` +
        `<span class="player-name">${escapeHtml(p.name)}</span>` +
      `</div>`
    ).join("") +
    `</div>` +
    `<button id="teamBackBtn" class="btn-secondary">← Back</button>`;

  _panel.querySelectorAll(".player-name").forEach(el => {
    el.addEventListener("click", () => startEditingName(el));
  });
}

function startEditingName(nameEl) {
  if (nameEl.querySelector("input")) return;
  const idx   = parseInt(nameEl.closest(".team-row").dataset.idx);
  const saved = TEAM.players[idx].name;

  const input = document.createElement("input");
  input.type      = "text";
  input.value     = saved;
  input.maxLength = 15;
  input.className = "name-input";
  nameEl.textContent = "";
  nameEl.appendChild(input);
  input.focus();
  input.select();

  const commit = () => {
    const trimmed = input.value.trim();
    TEAM.players[idx].name = trimmed || saved;
    nameEl.textContent = TEAM.players[idx].name;
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = saved;  input.blur(); }
  });
}
