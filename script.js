const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue    = document.getElementById("scoreValue");
const oversValue    = document.getElementById("oversValue");
const ballsValue    = document.getElementById("ballsValue");
const lastBallValue = document.getElementById("lastBallValue");
const batsmenValue  = document.getElementById("batsmenValue");
const overlay       = document.getElementById("overlay");
const legBtn        = document.getElementById("legBtn");
const offBtn        = document.getElementById("offBtn");
const pauseBtn      = document.getElementById("pauseBtn");
const practiceModeBtn = document.getElementById("practiceModeBtn");

const W = canvas.width;
const H = canvas.height;

const GAME = {
  maxBalls: 30,
  maxWickets: 3,
  state: "menu",
  score: 0,
  balls: 0,
  wickets: 0,
  lastBallText: "Waiting…",
  currentOverBalls: [],
  target: "",
  message: "",
  messageColor: "#ffffff",
  messageTimer: 0,
  impacts: [],
  confetti: [],
  trails: [],
  fieldMarkers: [],
  shotTimingScore: null,
  shotTimingOffsetNorm: 0,   // -1 early, 0 perfect, +1 late
  practiceMode: false,
  paused: false,
  finishResult: null,
  strikerIdx: 0,
  nonStrikerIdx: 1,
  nextBatsmanIdx: 2,
  batterRuns:  [0, 0, 0, 0, 0],
  batterBalls: [0, 0, 0, 0, 0],
  batterFours: [0, 0, 0, 0, 0],
  batterSixes: [0, 0, 0, 0, 0],
  battedOut:   [false, false, false, false, false],
};

const pitch = {
  topY: 196,
  bottomY: 688,
  centerX: W / 2,
  widthTop: 98,
  widthBottom: 340,
  batterY: 604,
  bowlerY: 176,
};

const striker = {
  x: pitch.centerX,
  y: pitch.batterY,
  swingSide: null,
  swingTimer: 0,
  poseTime: 0,
};

const wicketAnim = {
  active: false,
  timer: 0,
  pieces: [],
};

let ball = null;
let spawnCooldown = 1.0;
let lastTime = performance.now();
let flashLeg = 0;
let flashOff = 0;

const DELIVERY_TYPES = [
  {
    name: "Inswinger",
    preferredSide: "leg",
    idealTime: 0.73,
    scoringWindow: 0.48,
    wicketWindow: 0.18,
    speed: 650,
    swingCurve: -62,
    bounceLift: 22,
    length: 0.82,
    color1: "#ef5350",
    color2: "#8d1010",
    desc: "tailing into the pads",
  },
  {
    name: "Outswinger",
    preferredSide: "off",
    idealTime: 0.75,
    scoringWindow: 0.48,
    wicketWindow: 0.18,
    speed: 660,
    swingCurve: 62,
    bounceLift: 22,
    length: 0.82,
    color1: "#ef5350",
    color2: "#8d1010",
    desc: "shaping away outside off",
  },
  {
    name: "Yorker",
    preferredSide: "leg",
    idealTime: 0.63,
    scoringWindow: 0.35,
    wicketWindow: 0.16,
    speed: 770,
    swingCurve: 14,
    bounceLift: 4,
    length: 0.94,
    color1: "#ff7b54",
    color2: "#92211d",
    desc: "very full at the toes",
  },
  {
    name: "Bouncer",
    preferredSide: "off",
    idealTime: 0.84,
    scoringWindow: 0.48,
    wicketWindow: 0.18,
    speed: 705,
    swingCurve: 25,
    bounceLift: 52,
    length: 0.67,
    color1: "#ff5c5c",
    color2: "#7a0d0d",
    desc: "climbing sharply",
  },
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

function project(progress, lateral = 0) {
  const y = lerp(pitch.topY, pitch.bottomY, progress);
  const halfWidth = lerp(pitch.widthTop, pitch.widthBottom, progress) / 2;
  const x = pitch.centerX + (lateral / 100) * halfWidth;
  return { x, y, halfWidth };
}

function updateHud() {
  scoreValue.textContent = `${GAME.score}/${GAME.wickets}`;
  oversValue.textContent = `${toOvers(GAME.balls)} (${toOvers(GAME.maxBalls)})`;
  ballsValue.textContent = GAME.target;
  const overSlots = Array.from({ length: 6 }, (_, i) => GAME.currentOverBalls[i] ?? "–");
  lastBallValue.textContent = overSlots.join("  ");
  if (GAME.state === "menu") {
    batsmenValue.innerHTML = "–";
  } else {
    const s  = GAME.strikerIdx;
    const ns = GAME.nonStrikerIdx;
    batsmenValue.innerHTML =
      `<div class="batsman-row">` +
        `<span class="bat-name">${escapeHtml(TEAM.players[s].name)}<span class="striker-mark">*</span></span>` +
        `<span class="bat-runs">${GAME.batterRuns[s]}</span>` +
      `</div>` +
      `<div class="batsman-row">` +
        `<span class="bat-name">${escapeHtml(TEAM.players[ns].name)}</span>` +
        `<span class="bat-runs">${GAME.batterRuns[ns]}</span>` +
      `</div>`;
  }
}

function resetGame() {
  GAME.target = Math.floor(Math.random() * 41) + 80;
  GAME.score = 0;
  GAME.balls = 0;
  GAME.wickets = 0;
  GAME.lastBallText = "Waiting…";
  GAME.currentOverBalls = [];
  GAME.message = "";
  GAME.messageTimer = 0;
  GAME.impacts = [];
  GAME.confetti = [];
  GAME.trails = [];
  GAME.fieldMarkers = [];
  GAME.shotTimingScore = null;
  GAME.shotTimingOffsetNorm = 0;
  striker.swingSide = null;
  striker.swingTimer = 0;
  wicketAnim.active = false;
  wicketAnim.pieces = [];
  ball = null;
  spawnCooldown = 1.0;
  GAME.paused = false;
  GAME.finishResult = null;
  GAME.strikerIdx     = 0;
  GAME.nonStrikerIdx  = 1;
  GAME.nextBatsmanIdx = 2;
  GAME.batterRuns     = [0, 0, 0, 0, 0];
  GAME.batterBalls    = [0, 0, 0, 0, 0];
  GAME.batterFours    = [0, 0, 0, 0, 0];
  GAME.batterSixes    = [0, 0, 0, 0, 0];
  GAME.battedOut      = [false, false, false, false, false];
  GAME.state = "playing";
  overlay.classList.remove("show");
  updateHud();
}

function postMessage(text, color = "#ffffff", duration = 1.0) {
  GAME.message = text;
  GAME.messageColor = color;
  GAME.messageTimer = duration;
}

function chooseDelivery() {
  const type = DELIVERY_TYPES[Math.floor(Math.random() * DELIVERY_TYPES.length)];
  return {
    type,
    t: 0,
    elapsed: 0,
    releaseTime: performance.now() / 1000,
    startLateral: rand(-10, 10),
    targetLateral: rand(-25, 25),
    x: pitch.centerX,
    y: pitch.topY,
    worldLateral: 0,
    radius: 9.2,
    seamRot: rand(0, Math.PI * 2),
    shadowAlpha: 0.25,
    judged: false,
    hit: false,
    shotSide: null,
    quality: 0,
    vx: 0,
    vy: 0,
    life: 0,
    justBounced: false,
  };
}

function spawnBall() {
  if (GAME.state !== "playing") return;
  if (GAME.balls >= GAME.maxBalls || GAME.wickets >= GAME.maxWickets) return;
  ball = chooseDelivery();
  GAME.shotTimingScore = null;
  GAME.shotTimingOffsetNorm = 0;
  updateHud();
}

function addTrail(x, y, r) {
  GAME.trails.push({ x, y, r, life: 0.20, maxLife: 0.20 });
}

function addImpact(x, y, count = 8, color = "224,193,140") {
  for (let i = 0; i < count; i++) {
    GAME.impacts.push({
      x, y, vx: rand(-90, 90), vy: rand(-130, 15), size: rand(4, 12),
      life: rand(0.35, 0.8), maxLife: rand(0.35, 0.8), color,
    });
  }
}

function addConfetti(x, y, count = 16) {
  const palette = ["#ffffff", "#ffe58a", "#97f4b8", "#7cc0ff"];
  for (let i = 0; i < count; i++) {
    GAME.confetti.push({
      x, y, vx: rand(-260, 260), vy: rand(-330, -100), rot: rand(0, Math.PI * 2),
      vr: rand(-10, 10), size: rand(4, 10), life: rand(0.9, 1.6),
      maxLife: rand(0.9, 1.6), color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
}

function addFieldMarker(side, power, runs) {
  const x = side === "leg" ? rand(200, 470) : rand(W - 470, W - 200);
  const y = rand(395, 565) - power * 0.05;
  GAME.fieldMarkers.push({ x, y, text: runs === 6 ? "SIX" : "FOUR", life: 1.4, maxLife: 1.4 });
}

function startWicketAnimation(hitX, hitY) {
  wicketAnim.active = true;
  wicketAnim.timer = 1.1;
  wicketAnim.pieces = [];
  const stumpBase = project(0.925, 0);
  const s = lerp(0.58, 1.18, 0.925);
  const spacing = 11 * s;
  const stumpH = 40 * s;
  const parts = [
    { x: stumpBase.x - spacing, y: stumpBase.y - stumpH / 2, w: 5, h: stumpH, rot: 0 },
    { x: stumpBase.x, y: stumpBase.y - stumpH / 2, w: 5, h: stumpH, rot: 0 },
    { x: stumpBase.x + spacing, y: stumpBase.y - stumpH / 2, w: 5, h: stumpH, rot: 0 },
    { x: stumpBase.x - spacing / 2, y: stumpBase.y - stumpH + 1, w: spacing, h: 4, rot: 0.08 },
    { x: stumpBase.x + spacing / 2, y: stumpBase.y - stumpH + 2, w: spacing, h: 4, rot: -0.08 },
  ];
  for (const p of parts) {
    wicketAnim.pieces.push({
      x: p.x, y: p.y, w: p.w, h: p.h, rot: p.rot,
      vx: rand(-180, 180) + (p.x - hitX) * 1.2, vy: rand(-320, -160), vr: rand(-5, 5),
    });
  }
  addImpact(hitX, hitY, 16, "240,223,192");
  addImpact(hitX, hitY, 8, "255,70,70");
}

function wouldHitStumps(ballObj) {
  return ballObj.t >= 0.935 && Math.abs(ballObj.worldLateral) <= 11;
}

function computeTiming(pressTime, type) {
  const delta = pressTime - type.idealTime;
  const absDelta = Math.abs(delta);
  const ratio = clamp(absDelta / type.scoringWindow, 0, 1);
  const score = Math.round((1 - ratio) * 100);
  const offsetNorm = clamp(delta / type.scoringWindow, -1, 1); // -1 top early, +1 bottom late
  return { delta, absDelta, score, offsetNorm };
}

function judgeShot(side) {
  if (!ball || ball.hit || ball.judged || GAME.state !== "playing") return;

  const pressTime = ball.elapsed;
  const timing = computeTiming(pressTime, ball.type);
  GAME.shotTimingScore = timing.score;
  GAME.shotTimingOffsetNorm = timing.offsetNorm;

  ball.judged = true;
  ball.shotSide = side;

  if (side !== ball.type.preferredSide) {
    // Wrong side: good timing still earns 1 run, but no boundary scoring
    if (timing.score >= 55) {
      resolveRuns(1, "Wrong side · nicked for 1");
      launchHit(side, timing.score / 100, 1, true);
    } else if (wouldHitStumps(ball)) {
      resolveWicket("Wrong side · bowled", ball.x, ball.y);
    } else {
      ball.pendingResult = "dot";
      ball.pendingText = "Wrong side";
    }
    return;
  }

  if (timing.absDelta > ball.type.scoringWindow) {
    ball.pendingResult = wouldHitStumps(ball) && timing.absDelta > ball.type.wicketWindow
      ? "wicket"
      : "dot";
    ball.pendingText = timing.delta < 0 ? "Too early" : "Too late";
    return;
  }

  const s = timing.score;
  if (s >= 90) {
    resolveRuns(6, "Perfectly timed");
    launchHit(side, s / 100, 6, false);
  } else if (s >= 75) {
    resolveRuns(4, "Timed sweetly");
    launchHit(side, s / 100, 4, false);
  } else if (s >= 55) {
    resolveRuns(2, "Decent timing");
    launchHit(side, s / 100, 2, true);
  } else if (s >= 35) {
    resolveRuns(1, "Mistimed single");
    launchHit(side, s / 100, 1, true);
  } else {
    ball.pendingResult = "dot";
    ball.pendingText = "Poor timing";
  }
}

function rotateStrike() {
  const tmp       = GAME.strikerIdx;
  GAME.strikerIdx    = GAME.nonStrikerIdx;
  GAME.nonStrikerIdx = tmp;
}

function resolveRuns(runs, text) {
  GAME.batterRuns[GAME.strikerIdx]  += runs;
  GAME.batterBalls[GAME.strikerIdx] += 1;
  if (runs === 4) GAME.batterFours[GAME.strikerIdx] += 1;
  if (runs === 6) GAME.batterSixes[GAME.strikerIdx] += 1;
  GAME.score += runs;
  GAME.balls += 1;
  GAME.lastBallText = runs ? `${runs} runs · ${text}` : text;
  if ((GAME.balls - 1) % 6 === 0) GAME.currentOverBalls = [];
  GAME.currentOverBalls.push(runs === 0 ? "·" : String(runs));
  if (runs % 2 === 1)       rotateStrike();  // odd runs cross the batsmen
  if (GAME.balls % 6 === 0) rotateStrike();  // end of over always rotates
  updateHud();
  if (!runs) postMessage("DOT", "#f5f7fb", 0.9);
  else if (runs === 6) postMessage("SIX!", "#ffe58a", 1.2);
  else if (runs === 4) postMessage("FOUR!", "#97f4b8", 1.1);
  else postMessage(`${runs}`, "#f5f7fb", 0.9);
  maybeFinish();
}

function resolveWicket(text, hitX, hitY) {
  GAME.wickets += 1;
  GAME.balls += 1;
  GAME.lastBallText = `WICKET · ${text}`;
  if ((GAME.balls - 1) % 6 === 0) GAME.currentOverBalls = [];
  GAME.currentOverBalls.push("W");
  GAME.batterBalls[GAME.strikerIdx] += 1;
  GAME.battedOut[GAME.strikerIdx]    = true;
  GAME.strikerIdx     = GAME.nextBatsmanIdx;
  GAME.nextBatsmanIdx += 1;
  if (GAME.balls % 6 === 0) rotateStrike();  // end of over after wicket
  updateHud();
  postMessage("BOWLED", "#ff9d9d", 1.2);
  startWicketAnimation(hitX, hitY);
  ball = null;
  spawnCooldown = 1.15;
  maybeFinish();
}

function maybeFinish() {
  if (GAME.score >= GAME.target) {
    GAME.state = "finishing";
    GAME.finishResult = {
      type: "win",
      ballsLeft: GAME.maxBalls - GAME.balls,
      wicketsLeft: GAME.maxWickets - GAME.wickets,
    };
    return;
  }
  if (GAME.balls >= GAME.maxBalls || GAME.wickets >= GAME.maxWickets) {
    GAME.state = "finishing";
    GAME.finishResult = GAME.score === GAME.target - 1
      ? { type: "tie" }
      : { type: "loss", runsShort: GAME.target - 1 - GAME.score, allOut: GAME.wickets >= GAME.maxWickets };
  }
}

function showFinishOverlay() {
  GAME.state = "over";
  showScorecardPanel(GAME.finishResult);
  overlay.classList.add("show");
}

function launchHit(side, quality, runs, grounded) {
  if (!ball) return;
  ball.hit = true;
  const sideDir = side === "leg" ? -1 : 1;
  const lift = runs === 6 ? rand(1.05, 1.28) : runs === 4 ? rand(0.72, 0.92) : rand(0.20, 0.45);
  const power = lerp(900, 1600, quality) * (runs === 6 ? 1.22 : runs === 4 ? 1.05 : 0.72);
  ball.vx = Math.cos(lift) * power * sideDir;
  ball.vy = -Math.sin(lift) * power * (grounded ? 0.58 : 0.92);
  ball.gravity = runs === 6 ? 480 : runs === 4 ? 680 : 1260;
  ball.drag   = runs === 6 ? 0.68 : runs === 4 ? 0.72 : 0.52;
  ball.life   = runs === 6 ? 4.2 : runs === 4 ? 3.2 : 1.25;
  if (runs >= 4) {
    addConfetti(ball.x, ball.y - 10, runs === 6 ? 28 : 16);
    addFieldMarker(side, power, runs);
  }
}

function registerShot(side) {
  if (GAME.state !== "playing") return;
  // Delay the visual swing by 0.3s so it stays in sync with ball arrival
  setTimeout(() => {
    striker.swingSide = side;
    striker.swingTimer = 0.34;
  }, 300);
  if (side === "leg") {
    flashLeg = 0.16;
    legBtn.classList.add("active");
    setTimeout(() => legBtn.classList.remove("active"), 120);
  } else {
    flashOff = 0.16;
    offBtn.classList.add("active");
    setTimeout(() => offBtn.classList.remove("active"), 120);
  }
  judgeShot(side);
}

function updateBall(dt) {
  if (!ball) {
    updateHud();
    return;
  }

  ball.elapsed += dt;

  if (ball.hit) {
    ball.life -= dt;
    const grav = ball.gravity ?? 1260;
    const drag = ball.drag ?? 0.52;
    ball.vy += grav * dt;
    ball.x += ball.vx * dt * drag;
    ball.y += ball.vy * dt * drag;
    ball.seamRot += 16 * dt;
    addTrail(ball.x, ball.y, 7);
    if (ball.life <= 0 || ball.x < -200 || ball.x > W + 200 || ball.y > H + 120) {
      ball = null;
      spawnCooldown = 1.0;
    }
    return;
  }

  // Convert actual elapsed seconds into visual travel progress.
  const fullTravelTime = ball.type.idealTime + 0.18;
  ball.t = clamp(ball.elapsed / fullTravelTime, 0, 1.12);

  const p = clamp(ball.t, 0, 1.1);
  const swing = Math.sin(Math.min(p, ball.type.length) * Math.PI) * ball.type.swingCurve;
  ball.worldLateral = lerp(ball.startLateral, ball.targetLateral, p) + swing;

  const pos = project(p, ball.worldLateral);
  ball.x = pos.x;
  ball.y = pos.y;
  ball.radius = lerp(6.7, 13.8, clamp(p, 0, 1));
  ball.shadowAlpha = lerp(0.14, 0.34, clamp(p, 0, 1));

  let arc = 0;
  if (p <= ball.type.length) {
    const pre = p / Math.max(ball.type.length, 0.001);
    arc = -Math.sin(pre * Math.PI) * 15;
  } else {
    const post = (p - ball.type.length) / Math.max(1 - ball.type.length, 0.001);
    arc = Math.sin(post * Math.PI * 0.86) * ball.type.bounceLift;
  }
  ball.y += arc;
  ball.seamRot += 15 * dt;
  addTrail(ball.x, ball.y, ball.radius * 0.55);

  if (!ball.justBounced && p >= ball.type.length) {
    ball.justBounced = true;
    addImpact(ball.x, project(ball.type.length, ball.worldLateral).y + 4, 12, "225,190,140");
    postMessage("BOUNCE", "#ffffff", 0.38);
  }

  if (ball.elapsed > fullTravelTime + 0.02) {
    if (ball.judged && ball.pendingResult) {
      if (GAME.state !== "playing") {
        ball = null;
        return;
      }
      if (ball.pendingResult === "wicket") {
        resolveWicket(ball.pendingText + " · bowled", ball.x, ball.y);
      } else {
        resolveRuns(0, ball.pendingText + " · dot ball");
        ball = null;
        spawnCooldown = 0.92;
      }
    } else if (!ball.judged) {
      GAME.shotTimingScore = 0;
      GAME.shotTimingOffsetNorm = 1;
      if (wouldHitStumps(ball)) {
        resolveWicket("Left it on the stumps", ball.x, ball.y);
      } else {
        resolveRuns(0, "Too late · dot ball");
        ball = null;
        spawnCooldown = 0.92;
      }
    } else {
      ball = null;
      spawnCooldown = 0.92;
    }
  }
}

function updateEffects(dt) {
  for (let i = GAME.impacts.length - 1; i >= 0; i--) {
    const p = GAME.impacts[i];
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt;
    if (p.life <= 0) GAME.impacts.splice(i, 1);
  }
  for (let i = GAME.confetti.length - 1; i >= 0; i--) {
    const c = GAME.confetti[i];
    c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 720 * dt; c.rot += c.vr * dt;
    if (c.life <= 0) GAME.confetti.splice(i, 1);
  }
  for (let i = GAME.trails.length - 1; i >= 0; i--) {
    const t = GAME.trails[i];
    t.life -= dt;
    if (t.life <= 0) GAME.trails.splice(i, 1);
  }
  for (let i = GAME.fieldMarkers.length - 1; i >= 0; i--) {
    const f = GAME.fieldMarkers[i];
    f.life -= dt; f.y -= 24 * dt;
    if (f.life <= 0) GAME.fieldMarkers.splice(i, 1);
  }
  if (wicketAnim.active) {
    wicketAnim.timer -= dt;
    wicketAnim.pieces.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 760 * dt; p.rot += p.vr * dt;
    });
    if (wicketAnim.timer <= 0) {
      wicketAnim.active = false;
      wicketAnim.pieces = [];
    }
  }
  if (flashLeg > 0) flashLeg -= dt;
  if (flashOff > 0) flashOff -= dt;
  if (striker.swingTimer > 0) striker.swingTimer -= dt;
  else striker.swingSide = null;
  striker.poseTime += dt * 5.3;
  if (GAME.messageTimer > 0) GAME.messageTimer -= dt;
}

function update(dt) {
  if ((GAME.state === "playing" || GAME.state === "finishing") && !GAME.paused) {
    if (!ball) {
      if (GAME.state === "finishing") {
        showFinishOverlay();
      } else {
        spawnCooldown -= dt;
        if (spawnCooldown <= 0) spawnBall();
      }
    } else {
      updateBall(dt);
    }
  }
  updateEffects(dt);
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#6da8ff");
  g.addColorStop(0.23, "#9fd8ff");
  g.addColorStop(0.46, "#a8d48e");
  g.addColorStop(1, "#4d8d47");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W - 170, 100, 10, W - 170, 100, 80);
  sun.addColorStop(0, "rgba(255,252,210,0.95)");
  sun.addColorStop(1, "rgba(255,252,210,0)");
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(W - 170, 100, 80, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 7; i++) drawCloud(140 + i * 190, 78 + (i % 2) * 18, 0.8 + (i % 3) * 0.14);
}

function drawCloud(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  [[0,0,28],[28,-11,30],[57,-2,23],[30,12,31]].forEach(([cx, cy, r]) => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawStands() {
  ctx.fillStyle = "#2d4769";
  ctx.fillRect(0, 205, W, 95);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 125; i++) {
      const x = i * (W / 124);
      const y = 219 + row * 19 + Math.sin(i * 0.65 + row) * 1.6;
      ctx.fillStyle = `hsl(${(row * 30 + i * 9) % 360} 45% ${55 + row * 3}%)`;
      ctx.beginPath(); ctx.arc(x, y, 3.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = "#ddeaf7"; ctx.fillRect(0, 301, W, 7);
  ctx.fillStyle = "#5a9047"; ctx.fillRect(0, 308, W, 50);
}

function drawOutfield() {
  const g = ctx.createRadialGradient(W / 2, H * 0.80, 130, W / 2, H * 0.83, 760);
  g.addColorStop(0, "#7fc46b"); g.addColorStop(1, "#3c7b39");
  ctx.fillStyle = g; ctx.fillRect(0, 340, W, H - 340);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2;
  for (let i = 0; i < 11; i++) {
    ctx.beginPath(); ctx.moveTo(0, 405 + i * 30); ctx.lineTo(W, 405 + i * 30 + Math.sin(i * 1.1) * 8); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.34)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(W / 2, H + 190, 540, Math.PI * 1.10, Math.PI * 1.90); ctx.stroke();
}

function drawPitch() {
  const topHalf = pitch.widthTop / 2;
  const botHalf = pitch.widthBottom / 2;
  ctx.fillStyle = "#c99e64";
  ctx.beginPath();
  ctx.moveTo(pitch.centerX - topHalf, pitch.topY);
  ctx.lineTo(pitch.centerX + topHalf, pitch.topY);
  ctx.lineTo(pitch.centerX + botHalf, pitch.bottomY);
  ctx.lineTo(pitch.centerX - botHalf, pitch.bottomY);
  ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, pitch.topY, 0, pitch.bottomY);
  g.addColorStop(0, "rgba(255,255,255,0.07)");
  g.addColorStop(1, "rgba(0,0,0,0.07)");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.09)"; ctx.lineWidth = 2.4;
  for (let i = 0; i <= 9; i++) {
    const p = i / 9; const a = project(p, -100); const b = project(p, 100);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  drawCrease(0.11); drawCrease(0.925);
}

function drawCrease(progress) {
  const a = project(progress, -86);
  const b = project(progress, 86);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = lerp(1.4, 4.6, progress);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function drawStaticWickets(progress, scaleMul = 1) {
  const p = project(progress, 0);
  const s = lerp(0.58, 1.18, progress) * scaleMul;
  const h = 40 * s;
  const spacing = 11 * s;
  ctx.strokeStyle = "#f0dfc0";
  ctx.lineWidth = 4.2 * s;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(p.x + i * spacing, p.y); ctx.lineTo(p.x + i * spacing, p.y - h); ctx.stroke();
  }
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(p.x - spacing - 2, p.y - h + 2);
  ctx.lineTo(p.x, p.y - h + 1);
  ctx.lineTo(p.x + spacing + 2, p.y - h + 2);
  ctx.stroke();
}

function drawAnimatedWickets() {
  if (!wicketAnim.active) return;
  ctx.fillStyle = "#f0dfc0";
  for (const p of wicketAnim.pieces) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
}

function drawBowler() {
  const run = ball ? easeInOutSine(clamp(ball.t * 0.82, 0, 1)) : easeInOutSine(clamp(1 - spawnCooldown / 1.05, 0, 1));
  const x = pitch.centerX + Math.sin(performance.now() / 180) * 4;
  const y = pitch.bowlerY + run * 18;
  ctx.save(); ctx.translate(x, y); ctx.scale(0.84, 0.84);
  const arm = ball ? Math.sin(Math.min(ball.t * 3.2, 1) * Math.PI * 1.06) : 0;
  ctx.strokeStyle = "#102235"; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.fillStyle = "#f2c59d"; ctx.beginPath(); ctx.arc(0, -58, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e6b35"; ctx.fillRect(-15, -40, 30, 50);
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 10); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -28); ctx.lineTo(-28, -10 + Math.sin(performance.now() / 140) * 7);
  ctx.moveTo(0, -28); ctx.lineTo(28, -22 - arm * 40); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10); ctx.lineTo(-20, 52 + Math.sin(performance.now() / 140) * 8);
  ctx.moveTo(0, 10); ctx.lineTo(20, 52 - Math.sin(performance.now() / 140) * 8); ctx.stroke();
  ctx.restore();
}

function drawBatsman() {
  const x = striker.x;
  const y = striker.y + Math.sin(striker.poseTime) * 1.5;
  let batAngle = -0.58, bodyLean = 0, frontStep = 0;
  if (striker.swingSide === "leg") {
    const t = 1 - clamp(striker.swingTimer / 0.34, 0, 1);
    batAngle = lerp(-0.48, -2.4, easeOutCubic(t)); bodyLean = -14 * t; frontStep = -9 * t;
  } else if (striker.swingSide === "off") {
    const t = 1 - clamp(striker.swingTimer / 0.34, 0, 1);
    batAngle = lerp(-0.68, 0.46, easeOutCubic(t)); bodyLean = 14 * t; frontStep = 10 * t;
  }
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = "#13263b"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.fillStyle = "#efc39a"; ctx.beginPath(); ctx.arc(0, -86, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#214e8a"; ctx.fillRect(-20, -70, 40, 48);
  ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(bodyLean * 0.2, -12); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -50); ctx.lineTo(-22 + bodyLean * 0.15, -18);
  ctx.moveTo(0, -50); ctx.lineTo(22 + bodyLean * 0.3, -23); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(-16 + frontStep * 0.2, 42);
  ctx.moveTo(0, -12); ctx.lineTo(18 + frontStep, 44); ctx.stroke();
  ctx.save(); ctx.translate(20 + bodyLean * 0.55, -36); ctx.rotate(batAngle);
  const batGrad = ctx.createLinearGradient(0, -78, 0, 20);
  batGrad.addColorStop(0, "#e7c38e"); batGrad.addColorStop(1, "#b5874a");
  ctx.fillStyle = batGrad; roundRect(ctx, -5, -78, 15, 94, 5); ctx.fill();
  ctx.fillStyle = "#8b5b2c"; ctx.fillRect(-5, 10, 15, 12);
  ctx.restore(); ctx.restore();
}

function drawBall() {
  if (!ball) return;
  for (const t of GAME.trails) {
    const a = clamp(t.life / t.maxLife, 0, 1) * 0.22;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.globalAlpha = ball.shadowAlpha; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(ball.x + 4, Math.min(ball.y + ball.radius * 1.55, H - 30), ball.radius * 2.15, ball.radius * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.seamRot);
  const grad = ctx.createRadialGradient(-2, -3, 2, 0, 0, ball.radius * 1.35);
  grad.addColorStop(0, ball.type.color1); grad.addColorStop(1, ball.type.color2);
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, ball.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#f7ddcf"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, ball.radius * 0.58, -1.1, 1.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, ball.radius * 0.58, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();
  ctx.restore();
}

function drawEffects() {
  for (const p of GAME.impacts) {
    const alpha = clamp(p.life / p.maxLife, 0, 1) * 0.5;
    ctx.fillStyle = `rgba(${p.color},${alpha})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.2 + (1 - alpha)), 0, Math.PI * 2); ctx.fill();
  }
  for (const c of GAME.confetti) {
    const a = clamp(c.life / c.maxLife, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.color; ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6); ctx.restore();
  }
  for (const f of GAME.fieldMarkers) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center";
    ctx.font = "900 28px Inter, sans-serif";
    ctx.fillStyle = f.text === "SIX" ? "#ffe58a" : "#97f4b8";
    ctx.fillText(f.text, f.x, f.y); ctx.restore();
  }
}

function drawShotZones() {
  ctx.save();
  ctx.globalAlpha = 0.11 + flashLeg * 0.68; ctx.fillStyle = "#97f4b8";
  ctx.beginPath();
  ctx.moveTo(175, 670); ctx.quadraticCurveTo(370, 455, 595, 480); ctx.quadraticCurveTo(435, 545, 250, 720);
  ctx.closePath(); ctx.fill(); ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.11 + flashOff * 0.68; ctx.fillStyle = "#7cc0ff";
  ctx.beginPath();
  ctx.moveTo(W - 175, 670); ctx.quadraticCurveTo(W - 370, 455, W - 595, 480); ctx.quadraticCurveTo(W - 435, 545, W - 250, 720);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawDeliveryBadge() {
  if (!ball) return;
  ctx.fillStyle = "rgba(6,16,25,0.34)";
  roundRect(ctx, W / 2 - 140, 18, 280, 62, 16); ctx.fill();
  ctx.textAlign = "center"; ctx.fillStyle = "#f7fafc";
  ctx.font = "800 22px Inter, sans-serif"; ctx.fillText(ball.type.name, W / 2, 40);
  ctx.fillStyle = "rgba(247,250,252,0.82)"; ctx.font = "15px Inter, sans-serif"; ctx.fillText(ball.type.desc, W / 2, 58);
  // preferred side hint
  const sideLabel = ball.type.preferredSide === "leg" ? "← LEG SIDE" : "OFF SIDE →";
  const sideColor = ball.type.preferredSide === "leg" ? "#97f4b8" : "#7cc0ff";
  ctx.fillStyle = sideColor;
  ctx.font = "800 12px Inter, sans-serif";
  ctx.fillText(sideLabel, W / 2, 73);
}

function drawCenterText() {
  if (GAME.messageTimer <= 0 || !GAME.message) return;
  const a = clamp(GAME.messageTimer / 1.2, 0, 1);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center";
  ctx.font = "900 50px Inter, sans-serif"; ctx.fillStyle = GAME.messageColor;
  ctx.fillText(GAME.message, W / 2, 136); ctx.restore();
}

function drawKeyHUD() {
  drawKeyBlock(24, H - 88, "←", "LEG", "#97f4b8", flashLeg > 0);
  drawKeyBlock(W - 164, H - 88, "→", "OFF", "#7cc0ff", flashOff > 0);
}

function drawKeyBlock(x, y, key, label, accent, active) {
  ctx.save(); ctx.translate(x, y);
  roundRect(ctx, 0, 0, 140, 56, 16);
  ctx.fillStyle = active ? "rgba(151,244,184,0.24)" : "rgba(6,16,25,0.36)";
  if (label === "OFF" && active) ctx.fillStyle = "rgba(124,192,255,0.24)";
  ctx.fill(); ctx.strokeStyle = active ? accent : "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "900 24px Inter, sans-serif"; ctx.textAlign = "left"; ctx.fillText(key, 16, 34);
  ctx.font = "700 14px Inter, sans-serif"; ctx.fillText(label, 52, 33); ctx.restore();
}

function drawTimingMeterRight() {
  const boxX = W - 110;
  const boxY = 110;
  const trackX = boxX + 16;
  const trackY = boxY + 52;
  const trackW = 78;
  const trackH = 380;

  // Background panel
  ctx.save();
  ctx.fillStyle = "rgba(6,16,25,0.52)";
  roundRect(ctx, boxX, boxY, trackW + 32, trackH + 68, 20);
  ctx.fill();

  // Header label
  ctx.textAlign = "center";
  ctx.font = "700 11px Inter, sans-serif";
  ctx.fillStyle = "rgba(247,250,252,0.55)";
  ctx.fillText("TIMING", boxX + (trackW + 32) / 2, boxY + 20);
  ctx.fillText("METER", boxX + (trackW + 32) / 2, boxY + 34);

  // Band definitions
  const bands = [
    { label: "EARLY",        color: "rgba(255,100,100,0.55)",  frac: 0.30 },
    { label: "SLIGHT EARLY", color: "rgba(255,180,80,0.45)",   frac: 0.15 },
    { label: "PERFECT",      color: "rgba(255,229,138,0.75)",  frac: 0.10 },
    { label: "SLIGHT LATE",  color: "rgba(255,180,80,0.45)",   frac: 0.15 },
    { label: "LATE",         color: "rgba(255,100,100,0.55)",  frac: 0.30 },
  ];

  // Draw bands
  let bandY = trackY;
  const bandRects = [];
  for (const band of bands) {
    const bh = trackH * band.frac;
    ctx.fillStyle = band.color;
    roundRect(ctx, trackX, bandY, trackW, bh, 6);
    ctx.fill();
    bandRects.push({ y: bandY, h: bh, label: band.label });
    bandY += bh;
  }

  // Band labels
  ctx.font = "700 9px Inter, sans-serif";
  ctx.textAlign = "center";
  const cx = trackX + trackW / 2;
  for (const r of bandRects) {
    ctx.fillStyle = r.label === "PERFECT" ? "#1a1a1a" : "rgba(247,250,252,0.85)";
    ctx.fillText(r.label, cx, r.y + r.h / 2 + 3.5);
  }

  // Map offsetNorm (-1 early, 0 perfect, +1 late) → Y within track
  function normToY(norm) {
    return trackY + ((norm + 1) / 2) * trackH;
  }

  // Determine what to show
  let markerNorm  = null;
  let markerColor = "#ffffff";

  if (GAME.shotTimingScore !== null) {
    markerNorm = GAME.shotTimingOffsetNorm;
    if      (markerNorm < -0.65)  markerColor = "#ff6464";
    else if (markerNorm < -0.25)  markerColor = "#ffb450";
    else if (markerNorm <=  0.25) markerColor = "#ffe58a";
    else if (markerNorm <=  0.65) markerColor = "#ffb450";
    else                          markerColor = "#ff6464";
  } else if (ball && !ball.hit && GAME.practiceMode) {
    const timing = computeTiming(ball.elapsed, ball.type);
    markerNorm = timing.offsetNorm;
    markerColor = "rgba(124,192,255,0.95)";
  }

  // Draw marker dot with glow
  if (markerNorm !== null) {
    const my = normToY(markerNorm);
    ctx.save();
    ctx.shadowColor = markerColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = markerColor;
    ctx.beginPath(); ctx.arc(cx, my, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, my, 9, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();
}

function drawVersionTag() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "700 13px Inter, sans-serif";
  ctx.fillStyle = "rgba(247,250,252,0.45)";
  ctx.fillText("v24", W / 2, H - 22);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawScene() {
  drawSky();
  drawStands();
  drawOutfield();
  drawShotZones();
  drawPitch();
  drawStaticWickets(0.11, 0.74);
  if (!wicketAnim.active) drawStaticWickets(0.925, 1);
  drawAnimatedWickets();
  drawBowler();
  drawEffects();
  drawBatsman();
  drawBall();
  drawDeliveryBadge();
  drawCenterText();
  drawKeyHUD();
  drawTimingMeterRight();
  drawVersionTag();
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  ctx.clearRect(0, 0, W, H);
  drawScene();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") { e.preventDefault(); registerShot("leg"); }
  else if (e.key === "ArrowRight") { e.preventDefault(); registerShot("off"); }
  else if (e.key === "p" || e.key === "P") { togglePractice(); }
  else if (e.key === " ") { e.preventDefault(); togglePause(); }
});

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const btn = drawTimingMeterRight._btn;
  if (btn && cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
    GAME.practiceMode = !GAME.practiceMode;
  }
});

function togglePause() {
  if (GAME.state !== "playing") return;
  GAME.paused = !GAME.paused;
  pauseBtn.textContent = GAME.paused ? "▶ Resume" : "⏸ Pause";
  if (GAME.paused) {
    showScorecardPanel();
    overlay.classList.add("show");
  } else {
    overlay.classList.remove("show");
  }
}

function togglePractice() {
  GAME.practiceMode = !GAME.practiceMode;
  practiceModeBtn.textContent = GAME.practiceMode ? "Practice: ON" : "Practice: OFF";
  practiceModeBtn.classList.toggle("active", GAME.practiceMode);
}

document.querySelector(".brand").addEventListener("click", () => {
  if (GAME.state === "playing" && !GAME.paused) togglePause();
});

pauseBtn.addEventListener("click", togglePause);
practiceModeBtn.addEventListener("click", togglePractice);

function bindPress(el, side) {
  const fire = (e) => { e.preventDefault(); registerShot(side); };
  el.addEventListener("touchstart", fire, { passive: false });
  el.addEventListener("pointerdown", fire);
  el.addEventListener("mousedown", fire);
}

bindPress(legBtn, "leg");
bindPress(offBtn, "off");
overlay.addEventListener("click", e => {
  const id = e.target.id;
  if (id === "startBtn")                              resetGame();
  if (id === "viewTeamBtn" && GAME.state === "menu") showTeamPanel();
  if (id === "teamBackBtn")                           showIntroPanel();
  if (id === "restartBtn")                            resetGame();
  if (id === "resumeBtn")                             togglePause();
});

updateHud();
requestAnimationFrame(loop);