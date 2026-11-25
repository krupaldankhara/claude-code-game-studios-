import type {
  ProjectConfig,
  StudioArtifact,
  StudioSessionTurn,
} from '../types/studio';

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  projectName: 'Duskwater Angler',
  slug: 'duskwater-angler',
  engine: 'Web',
  engineVersion: 'Vite + TypeScript',
  genre: 'Cozy Arcade / Fishing',
  workflowMode: 'lean',
  automationMode: 'collaborative',
  directorGates: {
    creativeReview: true,
    architectureReview: true,
    qaReleaseGate: true,
  },
};

export const DUSKWATER_PROTOTYPE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Duskwater Angler — Prototype</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0c1220; font-family: system-ui, -apple-system, sans-serif; color: #f1f5f9; }
  canvas { display: block; width: 100%; height: 100%; cursor: pointer; }
  .hud { position: fixed; top: 12px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; font-size: 13px; }
  .hud-group { display: flex; gap: 16px; background: rgba(11, 14, 20, 0.72); border: 1px solid rgba(255,255,255,0.12); padding: 7px 12px; border-radius: 8px; font-variant-numeric: tabular-nums; }
  .dusk-tag { color: #fbbf24; font-weight: 600; }
  .prompt { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(11, 14, 20, 0.82); border: 1px solid rgba(255,255,255,0.14); padding: 8px 16px; border-radius: 8px; font-size: 13px; color: #e2e8f0; pointer-events: none; text-align: center; }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div class="hud">
  <div class="hud-group">
    <span id="phaseLabel">Late Afternoon</span>
    <span>·</span>
    <span>Score: <strong id="scoreVal">0</strong></span>
    <span>·</span>
    <span>Rare Dusk Catch: <strong id="rareVal">0</strong></span>
  </div>
  <div class="hud-group">
    <span id="statusVal">Ready to cast</span>
  </div>
</div>
<div class="prompt" id="promptText">Click or press Space to cast your line — rare Lanternfish only bite during Dusk</div>
<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const phaseLabel = document.getElementById('phaseLabel');
const scoreVal = document.getElementById('scoreVal');
const rareVal = document.getElementById('rareVal');
const statusVal = document.getElementById('statusVal');
const promptText = document.getElementById('promptText');

let w = 800, h = 450;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Time of day cycle: 0..1 (0.45..0.78 is Dusk Window)
let dayTime = 0.34;
let score = 0;
let rareCaught = 0;
let state = 'idle'; // idle | casting | waiting | hooked | caught
let bobber = { x: 0, y: 0, targetX: 0, targetY: 0, t: 0 };
let waitTimer = 0;
let hookFish = null;
let tension = 0.5;
let progress = 0;
let holding = false;
let splashTimer = 0;
let messageTimer = 0;
let lastCatchText = '';

const ripples = [];
const fishShadows = Array.from({ length: 7 }, (_, i) => ({
  x: Math.random() * 600 + 120,
  y: 0.62 + (i % 4) * 0.08,
  speed: (Math.random() * 24 + 14) * (i % 2 ? 1 : -1),
  size: 14 + (i % 3) * 6,
  rare: i >= 5
}));

function isDusk() {
  return dayTime >= 0.44 && dayTime <= 0.78;
}

function getPhaseName() {
  if (dayTime < 0.44) return 'Late Afternoon';
  if (dayTime <= 0.78) return 'Dusk Window — Rare Bite Active';
  return 'Deep Night';
}

function castLine() {
  state = 'casting';
  bobber.t = 0;
  bobber.targetX = w * (0.42 + Math.random() * 0.36);
  bobber.targetY = h * (0.64 + Math.random() * 0.18);
  statusVal.textContent = 'Casting...';
}

function triggerActionStart() {
  holding = true;
  if (state === 'idle' || state === 'caught') {
    castLine();
  } else if (state === 'waiting') {
    state = 'idle';
    statusVal.textContent = 'Reeled in early';
    promptText.textContent = 'Click or press Space to cast again';
  }
}

function triggerActionEnd() {
  holding = false;
}

canvas.addEventListener('pointerdown', triggerActionStart);
window.addEventListener('pointerup', triggerActionEnd);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); triggerActionStart(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') { e.preventDefault(); triggerActionEnd(); }
});

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Cycle slowly through afternoon -> dusk -> night -> afternoon
  dayTime += dt * 0.018;
  if (dayTime > 1) dayTime = 0.22;

  const duskActive = isDusk();
  phaseLabel.textContent = getPhaseName();
  phaseLabel.className = duskActive ? 'dusk-tag' : '';

  // Update fish shadows
  for (const f of fishShadows) {
    f.x += f.speed * dt;
    if (f.x < w * 0.22) { f.x = w * 0.22; f.speed = Math.abs(f.speed); }
    if (f.x > w * 0.92) { f.x = w * 0.92; f.speed = -Math.abs(f.speed); }
  }

  // Update ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].r += dt * 36;
    ripples[i].a -= dt * 0.9;
    if (ripples[i].a <= 0) ripples.splice(i, 1);
  }

  const rodTipX = w * 0.18 + 62;
  const rodTipY = h * 0.52 - 38;

  if (state === 'casting') {
    bobber.t += dt * 2.2;
    const t = Math.min(1, bobber.t);
    bobber.x = lerp(rodTipX, bobber.targetX, t);
    bobber.y = lerp(rodTipY, bobber.targetY, t) - Math.sin(t * Math.PI) * 70;
    if (t >= 1) {
      state = 'waiting';
      waitTimer = duskActive ? (1.2 + Math.random() * 1.4) : (1.8 + Math.random() * 1.8);
      ripples.push({ x: bobber.x, y: bobber.y, r: 4, a: 0.9 });
      statusVal.textContent = duskActive ? 'Waiting in Dusk...' : 'Waiting for bite...';
      promptText.textContent = duskActive
        ? 'Dusk glow detected — stay ready for a Lanternfish strike'
        : 'Wait for the bobber to dip — rare fish surface at Dusk';
    }
  } else if (state === 'waiting') {
    waitTimer -= dt;
    if (waitTimer <= 0) {
      const rareRoll = duskActive && Math.random() < 0.72;
      hookFish = rareRoll
        ? { name: 'Dusk Lanternfish', pts: 250, rare: true, pull: 0.42 }
        : { name: Math.random() < 0.5 ? 'Silver Perch' : 'Reed Trout', pts: 60, rare: false, pull: 0.26 };
      state = 'hooked';
      tension = 0.48;
      progress = 0.18;
      splashTimer = 0.5;
      ripples.push({ x: bobber.x, y: bobber.y, r: 6, a: 1 });
      statusVal.textContent = 'Hooked: ' + hookFish.name + '!';
      promptText.textContent = 'Hold Space or Mouse to reel — keep tension inside the amber zone';
    }
  } else if (state === 'hooked' && hookFish) {
    const pullWave = Math.sin(now * 0.008) * 0.18;
    tension += (holding ? 0.62 : -0.46) * dt - (hookFish.pull + pullWave) * dt * 0.35;
    tension = Math.max(0, Math.min(1, tension));
    const inSweetSpot = tension >= 0.3 && tension <= 0.76;
    progress += (inSweetSpot ? 0.38 : -0.14) * dt;
    bobber.x += Math.sin(now * 0.04) * 1.4;
    if (Math.random() < 0.12) ripples.push({ x: bobber.x, y: bobber.y, r: 4, a: 0.65 });

    if (progress >= 1) {
      score += hookFish.pts;
      if (hookFish.rare) rareCaught += 1;
      scoreVal.textContent = String(score);
      rareVal.textContent = String(rareCaught);
      lastCatchText = 'Caught ' + hookFish.name + ' (+' + hookFish.pts + ')';
      statusVal.textContent = lastCatchText;
      promptText.textContent = lastCatchText + ' — Click or press Space to cast again';
      state = 'caught';
      messageTimer = 2.4;
      hookFish = null;
    } else if (progress <= 0 || tension >= 0.99) {
      lastCatchText = tension >= 0.99 ? 'Line snapped!' : 'Fish slipped away';
      statusVal.textContent = lastCatchText;
      promptText.textContent = lastCatchText + ' — Click or press Space to try again';
      state = 'idle';
      messageTimer = 1.8;
      hookFish = null;
    }
  }

  if (messageTimer > 0) messageTimer -= dt;
  if (splashTimer > 0) splashTimer -= dt;

  // Draw Sky
  const duskFactor = duskActive ? 1 - Math.abs((dayTime - 0.61) / 0.17) : 0;
  const nightFactor = dayTime > 0.78 ? Math.min(1, (dayTime - 0.78) / 0.15) : 0;
  const topSky = nightFactor > 0
    ? lerpColor([28, 25, 62], [10, 14, 28], nightFactor)
    : lerpColor([42, 76, 122], [38, 28, 72], duskFactor);
  const horizonSky = nightFactor > 0
    ? lerpColor([140, 74, 72], [22, 30, 52], nightFactor)
    : lerpColor([236, 174, 114], [229, 124, 58], duskFactor);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.56);
  skyGrad.addColorStop(0, topSky);
  skyGrad.addColorStop(1, horizonSky);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.56);

  // Sun sinking toward horizon
  const sunY = lerp(h * 0.22, h * 0.62, Math.min(1, (dayTime - 0.22) / 0.58));
  if (sunY < h * 0.58) {
    ctx.beginPath();
    ctx.arc(w * 0.72, sunY, 34, 0, Math.PI * 2);
    ctx.fillStyle = duskActive ? 'rgba(251, 191, 36, 0.9)' : 'rgba(254, 240, 199, 0.9)';
    ctx.fill();
  }

  // Distant pine ridge silhouette
  ctx.fillStyle = nightFactor > 0.3 ? '#090d16' : '#141a2b';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.56);
  for (let x = 0; x <= w; x += 28) {
    const ridge = Math.sin(x * 0.012) * 18 + Math.cos(x * 0.03) * 9;
    ctx.lineTo(x, h * 0.52 - Math.abs(ridge));
  }
  ctx.lineTo(w, h * 0.56);
  ctx.closePath();
  ctx.fill();

  // Lake water
  const waterGrad = ctx.createLinearGradient(0, h * 0.56, 0, h);
  waterGrad.addColorStop(0, duskActive ? '#2d233d' : '#1b314d');
  waterGrad.addColorStop(1, '#09101d');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, h * 0.56, w, h * 0.44);

  // Sun shimmer on water
  if (sunY < h * 0.58) {
    ctx.fillStyle = duskActive ? 'rgba(245, 158, 11, 0.16)' : 'rgba(254, 243, 199, 0.12)';
    for (let i = 0; i < 9; i++) {
      const sy = h * 0.58 + i * 16;
      const sw = 80 - i * 6 + Math.sin(now * 0.003 + i) * 10;
      ctx.fillRect(w * 0.72 - sw / 2, sy, sw, 4);
    }
  }

  // Fish shadows (rare Lanternfish glow golden-amber during dusk!)
  for (const f of fishShadows) {
    if (f.rare && !duskActive) continue;
    const fy = h * f.y;
    ctx.save();
    ctx.translate(f.x, fy);
    if (f.speed < 0) ctx.scale(-1, 1);
    ctx.fillStyle = f.rare ? 'rgba(251, 191, 36, 0.55)' : 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, f.size, f.size * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-f.size, 0);
    ctx.lineTo(-f.size - 8, -5);
    ctx.lineTo(-f.size - 8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Wooden dock & angler silhouette
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(0, h * 0.55, w * 0.21, 12);
  ctx.fillRect(w * 0.07, h * 0.55, 8, 60);
  ctx.fillRect(w * 0.17, h * 0.55, 8, 66);

  // Angler figure
  const ax = w * 0.16;
  const ay = h * 0.55;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ax - 7, ay - 30, 14, 30);
  ctx.beginPath();
  ctx.arc(ax, ay - 38, 8, 0, Math.PI * 2);
  ctx.fill();

  // Fishing rod
  ctx.strokeStyle = '#d6b482';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ax + 5, ay - 20);
  ctx.quadraticCurveTo(ax + 38, ay - 46, rodTipX, rodTipY + (state === 'hooked' ? 10 : 0));
  ctx.stroke();

  // Ripples
  for (const rp of ripples) {
    ctx.strokeStyle = 'rgba(226, 232, 240, ' + Math.max(0, rp.a) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Fishing line & bobber
  if (state !== 'idle' && state !== 'caught') {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rodTipX, rodTipY + (state === 'hooked' ? 10 : 0));
    ctx.lineTo(bobber.x, bobber.y);
    ctx.stroke();

    const bobOffset = state === 'waiting' ? Math.sin(now * 0.005) * 2.5 : 0;
    ctx.beginPath();
    ctx.arc(bobber.x, bobber.y + bobOffset, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = state === 'hooked' ? '#f59e0b' : '#ef4444';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bobber.x, bobber.y + bobOffset - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tension & catch progress gauge when hooked
  if (state === 'hooked') {
    const gx = w * 0.5 - 120;
    const gy = h * 0.24;
    const gw = 240;
    ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
    ctx.fillRect(gx - 12, gy - 12, gw + 24, 56);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.strokeRect(gx - 12, gy - 12, gw + 24, 56);

    // Tension track
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gx, gy, gw, 12);
    // Sweet spot
    ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.fillRect(gx + gw * 0.3, gy, gw * 0.46, 12);
    // Marker
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(gx + tension * gw - 3, gy - 3, 6, 18);

    // Catch progress bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gx, gy + 24, gw, 8);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(gx, gy + 24, gw * Math.max(0, Math.min(1, progress)), 8);
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
</script>
</body>
</html>`;

export const SEED_ARTIFACTS: StudioArtifact[] = [
  {
    id: 'art-duskwater-brief',
    title: 'Duskwater Angler — One-Page Game Brief',
    path: 'design/game-brief.md',
    kind: 'brief',
    command: '/prototype a fishing game where the rare fish only bite at dusk',
    authorAgent: 'game-designer',
    updatedAt: '2026-11-24T19:30:00Z',
    playableHtml: DUSKWATER_PROTOTYPE_HTML,
    content: `# Duskwater Angler — Game Brief

## Core Premise
A tranquil twilight fishing game where common perch and trout bite throughout the afternoon, but high-value bioluminescent **Dusk Lanternfish** only surface during the fleeting amber-violet Dusk Window.

## The First Minute
1. Player arrives on a quiet wooden dock overlooking a mountain lake as late afternoon softens into sunset.
2. One button (**Click** or **Space**) casts the line and reels against fish tension.
3. As the sun dips toward the pine ridge, the water shifts violet and golden silhouettes appear beneath the surface — signaling the active Dusk Window.

## Core Mechanic & Challenge
- **Cast & Wait**: Watch ripples and bobber dips; reeling early forfeits the cast.
- **Tension Sweet-Spot**: Hold Space/Mouse while hooked to keep the tension needle inside the amber zone. Over-reeling snaps the line; slacking lets the fish slip.
- **Time Pressure**: Maximize rare catches before deep night settles over the lake.

## Prototype Scope (Built)
- Continuous Afternoon -> Dusk -> Night sky and lake lighting cycle
- Drawn silhouette shoreline, dock, angler, animated fish shadows, and water ripples
- Full cast, wait, strike, tension-reel, catch, and line-snap loop

## Left For Later
- Bait crafting and multi-lake map progression
- Audio foley (water plop, reel clicks, cricket dusk ambience)
- Persistent species logbook`,
  },
  {
    id: 'art-adr-001',
    title: 'ADR-001: Deterministic Time-of-Day Cycle & Bite Tables',
    path: 'docs/architecture/ADR-001-time-of-day-loop.md',
    kind: 'adr',
    command: '/architecture-decision deterministic day-dusk-night cycle',
    authorAgent: 'technical-director',
    updatedAt: '2026-11-24T19:35:00Z',
    content: `# ADR-001: Deterministic Time-of-Day Cycle & Bite Tables

- **Status**: Accepted
- **Owner**: Technical Director & Lead Programmer
- **Engine Target**: Web (Vite + TypeScript)

## Context
The signature promise of Duskwater Angler is that rare species exclusively bite during Dusk. If time-of-day transitions are frame-rate dependent or mixed directly into render code, automated headless smoke runs and balance tests cannot reproduce dusk windows reliably.

## Decision
1. Represent time-of-day as a normalized scalar \`dayTime in [0, 1)\` stepped by clamped \`dt <= 0.05s\`.
2. Define phase intervals in data (\`assets/data/phases.json\`): Afternoon \`[0.0, 0.44)\`, Dusk \`[0.44, 0.78]\`, Night \`(0.78, 1.0)\`.
3. Separate bite-table sampling into a pure module (\`src/gameplay/biteTables.ts\`) accepting \`dayTime\` and a seeded RNG so unit tests can assert zero rare spawns outside Dusk.

## Consequences
- Positive: Deterministic seeded runs for \`/prototype\` regression checks and balance audits.
- Trade-off: Visual sky shader gradients must interpolate purely from \`dayTime\`.`,
  },
  {
    id: 'art-sprint-01',
    title: 'Sprint 01 — Vertical Slice & Dusk Loop Polish',
    path: 'production/sprint-01-plan.md',
    kind: 'sprint',
    command: '/sprint-plan vertical slice dusk fishing loop',
    authorAgent: 'producer',
    updatedAt: '2026-11-24T19:40:00Z',
    content: `# Sprint 01 Plan — Vertical Slice

- **Coordinator**: Producer
- **Workflow Mode**: Lean
- **Goal**: Ship a playable Duskwater Angler build with verifiable Dusk Window clarity and tension feedback.

## Committed Stories
1. **STORY-001 (Gameplay Programmer)**: Extract tension & bite-table state machine into \`src/gameplay/fishingLoop.ts\` with unit tests.
2. **STORY-002 (Technical Artist)**: Add subtle bioluminescent shimmer cue when Dusk Window opens so players never miss the timing shift.
3. **STORY-003 (UX Designer)**: Refine HUD typography and tension sweet-spot contrast for 1280x720 and mobile viewports.
4. **STORY-004 (QA Lead)**: Run headless smoke check verifying zero console errors across cast -> reel -> catch -> recast cycle.

## Risks & Cut Candidates
- **Risk**: Tension difficulty may punish first-time players before they catch one Lanternfish.
- **Mitigation**: Keep first cast forgiving and expose \`/balance-check\` tuning knobs.`,
  },
];

export const SEED_SESSION_TURNS: StudioSessionTurn[] = [
  {
    id: 'turn-seed-duskwater',
    createdAt: '2026-11-24T19:30:00Z',
    input: '/prototype a fishing game where the rare fish only bite at dusk',
    command: '/prototype',
    title: 'Duskwater Angler — Playable Prototype & One-Page Brief',
    summary:
      'Studio completed one-page brief and built a self-contained HTML5 Canvas prototype featuring a continuous afternoon-to-dusk lighting cycle, glowing rare Dusk Lanternfish spawns, and a tension-balance reeling mechanic.',
    delegation: [
      {
        agentId: 'creative-director',
        agentName: 'Creative Director',
        tier: 1,
        tierLabel: 'Director',
        department: 'Executive Leadership',
        roleInRun: 'Guard game identity, tone, and player fantasy',
        note: 'Anchor the visual drama around the fleeting amber-to-violet Dusk transition so the player feels the twilight window visually without relying on timers alone.',
      },
      {
        agentId: 'game-designer',
        agentName: 'Game Designer',
        tier: 2,
        tierLabel: 'Department Lead',
        department: 'Game & UX Design',
        roleInRun: 'Structure core loop, feel, challenge, and one-page brief',
        note: 'Locked the one-button cast/reel loop and tension sweet-spot gauge so casual casts stay approachable while rare Lanternfish require active tension control.',
      },
      {
        agentId: 'prototyper',
        agentName: 'Prototyper',
        tier: 3,
        tierLabel: 'Specialist',
        department: 'Game & UX Design',
        roleInRun: 'Build playable interactive vertical slice',
        note: 'Built prototypes/duskwater-angler/index.html with drawn shoreline, dock, animated fish shadows, ripples, and Dusk-gated Lanternfish spawns.',
      },
      {
        agentId: 'qa-lead',
        agentName: 'QA Lead',
        tier: 2,
        tierLabel: 'Department Lead',
        department: 'Quality & Accessibility',
        roleInRun: 'Verify launch stability, input responsiveness, and brief coverage',
        note: 'Canvas initializes cleanly with mouse and keyboard Space input. Handover status: Not yet played by a person — playtest tension feel in the Preview tab.',
      },
    ],
    artifactId: 'art-duskwater-brief',
    artifactPath: 'design/game-brief.md',
    artifactKind: 'brief',
    artifactContent: SEED_ARTIFACTS[0].content,
    playableHtml: DUSKWATER_PROTOTYPE_HTML,
    qaChecklist: [
      { item: 'Opens with zero runtime console errors and responsive canvas sizing', status: 'pass' },
      { item: 'Every figure drawn cleanly without emoji art or broken assets', status: 'pass' },
      { item: 'Rare Dusk Lanternfish only spawn during the active Dusk Window', status: 'pass' },
      { item: 'Reeling tension feel and pacing verified by human playtester', status: 'needs-human-play' },
    ],
    recommendedNextCommands: [
      '/balance-check dusk lanternfish catch rate and tension curve',
      '/art-bible twilight lakeside color palette and silhouette guide',
      '/sprint-plan grow duskwater angler into full web project',
    ],
  },
];
