import { ProjectFile } from '../types/index.js';

export interface TemplateProject {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  isUnsafeSample?: boolean;
  files: ProjectFile[];
}

export const TEMPLATES: TemplateProject[] = [
  {
    id: 'pomodoro-timer',
    name: 'Pomodoro Focus Timer',
    category: 'Productivity',
    description: 'Customizable work/break timer with audio alert synthesized via Web Audio API and session stats.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GenForge Pomodoro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 selection:bg-rose-500/30">
  <div class="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur text-center">
    <div class="flex justify-center gap-2 mb-6">
      <button id="mode-work" class="px-4 py-1.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">Work (25m)</button>
      <button id="mode-short" class="px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 hover:text-white">Short Break (5m)</button>
      <button id="mode-long" class="px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 hover:text-white">Long Break (15m)</button>
    </div>

    <!-- Timer Ring -->
    <div class="relative w-64 h-64 mx-auto my-6 flex items-center justify-center">
      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" stroke="#1e293b" stroke-width="6" fill="transparent"/>
        <circle id="progress-circle" cx="50" cy="50" r="44" stroke="#f43f5e" stroke-width="6" stroke-linecap="round" fill="transparent" stroke-dasharray="276.46" stroke-dashoffset="0" class="transition-all duration-300"/>
      </svg>
      <div class="absolute flex flex-col items-center">
        <span id="timer-display" class="text-5xl font-mono font-extrabold tracking-tighter">25:00</span>
        <span id="timer-label" class="text-xs uppercase tracking-widest text-slate-400 mt-1">Deep Work</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center justify-center gap-4 mt-6">
      <button id="btn-toggle" class="px-8 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/30 transition transform active:scale-95">Start Focus</button>
      <button id="btn-reset" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition">Reset</button>
    </div>

    <div class="mt-8 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
      <span>Completed Sessions: <strong id="session-count" class="text-rose-400">0</strong></span>
      <span>Sound Alert: <strong class="text-emerald-400">Synthesized</strong></span>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'style.css',
        content: `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');
#timer-display {
  font-family: 'JetBrains Mono', monospace;
}`,
      },
      {
        path: 'app.js',
        content: `const WORK_SEC = 25 * 60;
const SHORT_SEC = 5 * 60;
const LONG_SEC = 15 * 60;

let currentDuration = WORK_SEC;
let timeLeft = WORK_SEC;
let isRunning = false;
let timerId = null;
let completedSessions = 0;

const display = document.getElementById('timer-display');
const progressCircle = document.getElementById('progress-circle');
const btnToggle = document.getElementById('btn-toggle');
const btnReset = document.getElementById('btn-reset');
const sessionEl = document.getElementById('session-count');
const modeWork = document.getElementById('mode-work');
const modeShort = document.getElementById('mode-short');
const modeLong = document.getElementById('mode-long');
const timerLabel = document.getElementById('timer-label');

const CIRCUMFERENCE = 2 * Math.PI * 44;

function playChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (e) {
    console.log('Audio chime simulated:', e);
  }
}

function updateUI() {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  display.textContent = \`\${mins}:\${secs}\`;

  const offset = CIRCUMFERENCE - (timeLeft / currentDuration) * CIRCUMFERENCE;
  progressCircle.style.strokeDashoffset = offset;
}

function switchMode(duration, label, activeBtn, color) {
  clearInterval(timerId);
  isRunning = false;
  btnToggle.textContent = 'Start Focus';
  btnToggle.className = \`px-8 py-3 rounded-xl \${color} text-white font-semibold shadow-lg transition active:scale-95\`;
  progressCircle.setAttribute('stroke', color.includes('rose') ? '#f43f5e' : color.includes('emerald') ? '#10b981' : '#3b82f6');
  
  [modeWork, modeShort, modeLong].forEach(btn => {
    btn.className = 'px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 hover:text-white';
  });
  activeBtn.className = \`px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-700 text-white border border-slate-500\`;

  currentDuration = duration;
  timeLeft = duration;
  timerLabel.textContent = label;
  updateUI();
}

modeWork.addEventListener('click', () => switchMode(WORK_SEC, 'Deep Work', modeWork, 'bg-rose-600 hover:bg-rose-500'));
modeShort.addEventListener('click', () => switchMode(SHORT_SEC, 'Short Break', modeShort, 'bg-emerald-600 hover:bg-emerald-500'));
modeLong.addEventListener('click', () => switchMode(LONG_SEC, 'Long Rest', modeLong, 'bg-blue-600 hover:bg-blue-500'));

btnToggle.addEventListener('click', () => {
  if (isRunning) {
    clearInterval(timerId);
    isRunning = false;
    btnToggle.textContent = 'Resume';
  } else {
    isRunning = true;
    btnToggle.textContent = 'Pause';
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateUI();
      } else {
        clearInterval(timerId);
        isRunning = false;
        playChime();
        if (currentDuration === WORK_SEC) {
          completedSessions++;
          sessionEl.textContent = completedSessions;
        }
        btnToggle.textContent = 'Completed!';
      }
    }, 1000);
  }
});

btnReset.addEventListener('click', () => {
  clearInterval(timerId);
  isRunning = false;
  timeLeft = currentDuration;
  btnToggle.textContent = 'Start Focus';
  updateUI();
});

updateUI();
console.log('Pomodoro Timer Ready.');`,
      },
    ],
  },
  {
    id: 'recipe-cost-calculator',
    name: 'Recipe Cost & Margin Calculator',
    category: 'Finance / Business',
    description: 'Calculate ingredient portion costs, overhead markups, batch yields, and target gross margins.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recipe Cost Calculator</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="text-amber-400">🍳</span> Recipe Cost & Margin Studio
          </h1>
          <p class="text-slate-400 text-xs mt-1">Accurately price menu items, calculate food cost percentage & profit.</p>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs text-slate-400">Batch Yield (Servings):</label>
          <input id="batch-yield" type="number" min="1" value="4" class="w-20 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-center font-bold text-cyan-400 focus:outline-none focus:border-cyan-500">
        </div>
      </div>

      <!-- Ingredient list -->
      <div class="mt-6">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300">Ingredients</h2>
          <button id="add-ingredient" class="px-3 py-1.5 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition">+ Add Ingredient</button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="text-xs text-slate-400 border-b border-slate-700">
                <th class="pb-2">Ingredient</th>
                <th class="pb-2">Pack Qty & Unit</th>
                <th class="pb-2">Pack Cost ($)</th>
                <th class="pb-2">Used Qty</th>
                <th class="pb-2 text-right">Line Cost</th>
                <th class="pb-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody id="ingredients-body" class="divide-y divide-slate-800">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cost Breakdown Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700">
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span class="text-xs text-slate-400">Total Batch Cost</span>
          <div id="total-batch-cost" class="text-2xl font-bold text-white mt-1">$0.00</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span class="text-xs text-slate-400">Cost Per Serving</span>
          <div id="cost-per-serving" class="text-2xl font-bold text-cyan-400 mt-1">$0.00</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="flex justify-between items-center">
            <span class="text-xs text-slate-400">Target Food Cost %</span>
            <input id="target-fc" type="number" value="30" class="w-14 text-right bg-slate-800 px-1 py-0.5 rounded text-xs text-amber-400">
          </div>
          <div id="suggested-price" class="text-2xl font-bold text-emerald-400 mt-1">$0.00</div>
          <span class="text-[10px] text-slate-500">Suggested Menu Price</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span class="text-xs text-slate-400">Gross Margin per Dish</span>
          <div id="gross-margin" class="text-2xl font-bold text-indigo-400 mt-1">$0.00</div>
        </div>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'app.js',
        content: `let ingredients = [
  { id: 1, name: 'Arborio Rice', packQty: 1000, unit: 'g', packCost: 4.50, usedQty: 300 },
  { id: 2, name: 'Parmigiano Reggiano', packQty: 250, unit: 'g', packCost: 8.00, usedQty: 60 },
  { id: 3, name: 'Chicken Stock', packQty: 1000, unit: 'ml', packCost: 3.20, usedQty: 750 },
  { id: 4, name: 'Butter', packQty: 250, unit: 'g', packCost: 3.50, usedQty: 45 }
];

const tbody = document.getElementById('ingredients-body');
const batchYieldEl = document.getElementById('batch-yield');
const targetFcEl = document.getElementById('target-fc');
const totalBatchEl = document.getElementById('total-batch-cost');
const costPerServingEl = document.getElementById('cost-per-serving');
const suggestedPriceEl = document.getElementById('suggested-price');
const grossMarginEl = document.getElementById('gross-margin');
const btnAdd = document.getElementById('add-ingredient');

function render() {
  tbody.innerHTML = '';
  let totalBatchCost = 0;

  ingredients.forEach((item, index) => {
    const unitPrice = item.packQty > 0 ? (item.packCost / item.packQty) : 0;
    const lineCost = unitPrice * item.usedQty;
    totalBatchCost += lineCost;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    tr.innerHTML = \`
      <td class="py-2.5">
        <input type="text" value="\${item.name}" class="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-cyan-500 text-white text-sm w-full outline-none" data-idx="\${index}" data-field="name">
      </td>
      <td class="py-2.5">
        <div class="flex items-center gap-1">
          <input type="number" value="\${item.packQty}" class="w-16 bg-slate-950 px-2 py-1 rounded text-xs text-white" data-idx="\${index}" data-field="packQty">
          <span class="text-xs text-slate-400">\${item.unit}</span>
        </div>
      </td>
      <td class="py-2.5">
        <div class="flex items-center gap-1">
          <span class="text-xs text-slate-400">$</span>
          <input type="number" step="0.01" value="\${item.packCost.toFixed(2)}" class="w-16 bg-slate-950 px-2 py-1 rounded text-xs text-white" data-idx="\${index}" data-field="packCost">
        </div>
      </td>
      <td class="py-2.5">
        <input type="number" value="\${item.usedQty}" class="w-16 bg-slate-950 px-2 py-1 rounded text-xs text-cyan-300 font-semibold" data-idx="\${index}" data-field="usedQty">
      </td>
      <td class="py-2.5 text-right font-mono font-medium text-slate-200">
        $\${lineCost.toFixed(2)}
      </td>
      <td class="py-2.5 text-center">
        <button class="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded transition" data-action="remove" data-idx="\${index}">✕</button>
      </td>
    \`;
    tbody.appendChild(tr);
  });

  const servings = Math.max(1, parseFloat(batchYieldEl.value) || 1);
  const costPerServing = totalBatchCost / servings;
  const targetFcPct = Math.max(5, parseFloat(targetFcEl.value) || 30) / 100;
  const suggestedPrice = costPerServing / targetFcPct;
  const margin = suggestedPrice - costPerServing;

  totalBatchEl.textContent = \`$\${totalBatchCost.toFixed(2)}\`;
  costPerServingEl.textContent = \`$\${costPerServing.toFixed(2)}\`;
  suggestedPriceEl.textContent = \`$\${suggestedPrice.toFixed(2)}\`;
  grossMarginEl.textContent = \`$\${margin.toFixed(2)}\`;
}

tbody.addEventListener('input', (e) => {
  const target = e.target;
  const idx = target.dataset.idx;
  const field = target.dataset.field;
  if (idx !== undefined && field) {
    if (field === 'name') {
      ingredients[idx].name = target.value;
    } else {
      ingredients[idx][field] = parseFloat(target.value) || 0;
      render();
    }
  }
});

tbody.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'remove') {
    const idx = parseInt(e.target.dataset.idx, 10);
    ingredients.splice(idx, 1);
    render();
  }
});

btnAdd.addEventListener('click', () => {
  ingredients.push({
    id: Date.now(),
    name: 'New Ingredient',
    packQty: 1000,
    unit: 'g',
    packCost: 5.00,
    usedQty: 100
  });
  render();
});

batchYieldEl.addEventListener('input', render);
targetFcEl.addEventListener('input', render);

render();
console.log('Recipe Calculator loaded.');`,
      },
    ],
  },
  {
    id: 'saas-landing-page',
    name: 'SaaS Product Landing Page',
    category: 'Marketing',
    description: 'High-conversion hero section, feature cards, live pricing tier switcher, and FAQ accordion.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ApexCloud - Next-Gen Infrastructure</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 antialiased font-sans">
  <nav class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white">A</div>
      <span class="font-bold text-lg text-white">ApexCloud</span>
    </div>
    <div class="hidden md:flex gap-6 text-sm text-slate-400 font-medium">
      <a href="#features" class="hover:text-cyan-400 transition">Features</a>
      <a href="#pricing" class="hover:text-cyan-400 transition">Pricing</a>
      <a href="#faq" class="hover:text-cyan-400 transition">FAQ</a>
    </div>
    <button class="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition">Start Free Trial</button>
  </nav>

  <!-- Hero -->
  <section class="max-w-5xl mx-auto px-6 py-20 text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
      <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> Apex 2.0 Engine Now Available
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
      Deploy scalable cloud edge <br/><span class="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">in single milliseconds.</span>
    </h1>
    <p class="max-w-2xl mx-auto text-slate-400 text-lg mb-8">
      Zero cold-starts, sub-10ms global routing, and native multi-region SQLite replicas with automated security validation.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button class="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20">Get Started Now</button>
      <button class="px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition">Book Architecture Demo</button>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="max-w-5xl mx-auto px-6 py-16">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold mb-4">⚡</div>
        <h3 class="text-lg font-bold text-white mb-2">Instant Global Edge</h3>
        <p class="text-sm text-slate-400">Routes incoming requests to 310+ edge pops closest to your user automatically.</p>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">🛡️</div>
        <h3 class="text-lg font-bold text-white mb-2">Dual-Signal Defense</h3>
        <p class="text-sm text-slate-400">AI behavioral heuristics combined with deterministic AST scanning stops zero-days.</p>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-4">📈</div>
        <h3 class="text-lg font-bold text-white mb-2">Predictable Billing</h3>
        <p class="text-sm text-slate-400">No surprise overages. Clear per-seat pricing and automated concurrency capping.</p>
      </div>
    </div>
  </section>
</body>
</html>`,
      },
    ],
  },
  {
    id: 'developer-portfolio',
    name: 'Developer Portfolio & Project Showcase',
    category: 'Portfolio',
    description: 'Clean dark portfolio with interactive project filter, contact form simulator, and tech stack tags.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alex Chen - Systems & ML Engineer</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-200 min-h-screen font-sans p-6">
  <div class="max-w-3xl mx-auto space-y-12">
    <!-- Header -->
    <header class="flex items-center gap-6 pt-8">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl">
        AC
      </div>
      <div>
        <h1 class="text-3xl font-bold text-white">Alex Chen</h1>
        <p class="text-slate-400 text-sm mt-1">Full-Stack Engineer & AI Security Researcher</p>
        <div class="flex gap-2 mt-2">
          <span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-cyan-400">TypeScript</span>
          <span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-emerald-400">PyTorch</span>
          <span class="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-indigo-400">Rust</span>
        </div>
      </div>
    </header>

    <!-- Bio -->
    <section class="text-slate-300 leading-relaxed text-sm">
      I build developer tooling at the intersection of large language models and static code analysis. Currently exploring automated vulnerability remediation and cross-language AST representations.
    </section>

    <!-- Projects -->
    <section class="space-y-4">
      <h2 class="text-sm uppercase tracking-wider font-bold text-slate-400">Selected Work</h2>
      <div class="grid grid-cols-1 gap-4">
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-white">CodeBERT Vulnerability Cross-Check</h3>
            <span class="text-xs text-cyan-400 font-mono">Open Source</span>
          </div>
          <p class="text-xs text-slate-400 mt-2">Dual-signal pipeline classifying AST vulnerabilities and mapping CVE patterns to actionable remediation diffs.</p>
        </div>
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-white">HyperGraph Distributed Cache</h3>
            <span class="text-xs text-purple-400 font-mono">Rust / Tokio</span>
          </div>
          <p class="text-xs text-slate-400 mt-2">Lock-free in-memory cache supporting CRDT-backed cross-datacenter state synchronizations.</p>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`,
      },
    ],
  },
  {
    id: 'analytics-dashboard',
    name: 'Executive Analytics Dashboard',
    category: 'Dashboard',
    description: 'Metrics KPI cards, live time-range filter, simulated chart metrics, and recent activity log.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse Analytics</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-white">Platform Analytics</h1>
        <p class="text-xs text-slate-400">Real-time throughput and error rate monitoring.</p>
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white">24 Hours</button>
        <button class="px-3 py-1.5 rounded-lg bg-cyan-600 text-xs text-white font-medium">7 Days</button>
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white">30 Days</button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <span class="text-xs text-slate-400">API Requests</span>
        <div class="text-2xl font-bold text-white mt-1">2,481,920</div>
        <span class="text-xs text-emerald-400 font-medium">↑ +14.2% vs last week</span>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <span class="text-xs text-slate-400">Average P95 Latency</span>
        <div class="text-2xl font-bold text-cyan-400 mt-1">42ms</div>
        <span class="text-xs text-emerald-400 font-medium">↓ -8ms improvement</span>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <span class="text-xs text-slate-400">Security Scans</span>
        <div class="text-2xl font-bold text-indigo-400 mt-1">18,490</div>
        <span class="text-xs text-slate-400">99.4% clean rate</span>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <span class="text-xs text-slate-400">Active Instances</span>
        <div class="text-2xl font-bold text-emerald-400 mt-1">128 / 128</div>
        <span class="text-xs text-emerald-400 font-medium">Healthy</span>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
    ],
  },
  {
    id: 'fast-notes',
    name: 'Fast Notes with Fuzzy Search',
    category: 'Productivity',
    description: 'Instant local markdown note editor with search filter, tag badges, and auto-save.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fast Notes</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px]">
    <!-- Sidebar -->
    <div class="w-full md:w-64 border-r border-slate-800 p-4 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">Notes</h2>
        <button id="btn-new" class="text-xs px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium">+ New</button>
      </div>
      <input id="search-box" type="text" placeholder="Search notes..." class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500">
      <div id="notes-list" class="space-y-1 overflow-y-auto max-h-96">
        <!-- List items -->
      </div>
    </div>
    <!-- Editor -->
    <div class="flex-1 p-6 flex flex-col space-y-4">
      <input id="note-title" type="text" placeholder="Note Title" class="w-full bg-transparent text-xl font-bold text-white border-b border-slate-800 pb-2 outline-none focus:border-cyan-500">
      <textarea id="note-body" placeholder="Write thoughts here..." class="flex-1 w-full bg-transparent text-sm text-slate-300 resize-none outline-none leading-relaxed min-h-[300px]"></textarea>
      <div class="text-[11px] text-slate-500 flex justify-between">
        <span id="save-status">Saved locally</span>
        <span id="char-count">0 characters</span>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'app.js',
        content: `let notes = [
  { id: 1, title: 'CodeBERT Scan Architecture', body: 'The dual-signal engine compares CodeBERT semantic risk predictions against AST pattern checks for deterministic coverage.', date: 'Just now' },
  { id: 2, title: 'Meeting Takeaways', body: 'Sprint goals finalized: ship Ask Mode streaming with grounded citations, resizable studio panels, and Vercel one-click deploy.', date: 'Today' }
];

let activeId = 1;
const listEl = document.getElementById('notes-list');
const titleEl = document.getElementById('note-title');
const bodyEl = document.getElementById('note-body');
const searchEl = document.getElementById('search-box');
const btnNew = document.getElementById('btn-new');
const charEl = document.getElementById('char-count');

function renderList() {
  const query = searchEl.value.toLowerCase();
  listEl.innerHTML = '';
  
  notes
    .filter(n => n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query))
    .forEach(n => {
      const div = document.createElement('div');
      div.className = \`p-2.5 rounded-lg text-xs cursor-pointer transition \${n.id === activeId ? 'bg-cyan-950/60 border border-cyan-800/60 text-cyan-200' : 'hover:bg-slate-800 text-slate-400'}\`;
      div.innerHTML = \`<div class="font-semibold text-slate-200 truncate">\${n.title || 'Untitled'}</div><div class="text-[10px] text-slate-500 truncate mt-0.5">\${n.body}</div>\`;
      div.onclick = () => {
        activeId = n.id;
        loadActiveNote();
        renderList();
      };
      listEl.appendChild(div);
    });
}

function loadActiveNote() {
  const note = notes.find(n => n.id === activeId);
  if (note) {
    titleEl.value = note.title;
    bodyEl.value = note.body;
    charEl.textContent = \`\${note.body.length} characters\`;
  }
}

titleEl.addEventListener('input', () => {
  const note = notes.find(n => n.id === activeId);
  if (note) {
    note.title = titleEl.value;
    renderList();
  }
});

bodyEl.addEventListener('input', () => {
  const note = notes.find(n => n.id === activeId);
  if (note) {
    note.body = bodyEl.value;
    charEl.textContent = \`\${note.body.length} characters\`;
  }
});

searchEl.addEventListener('input', renderList);

btnNew.addEventListener('click', () => {
  const newNote = { id: Date.now(), title: 'Untitled Note', body: '', date: 'Now' };
  notes.unshift(newNote);
  activeId = newNote.id;
  renderList();
  loadActiveNote();
  titleEl.focus();
});

renderList();
loadActiveNote();`,
      },
    ],
  },
  {
    id: 'kanban-todo',
    name: 'Todo & Kanban Task Board',
    category: 'Productivity',
    description: 'Drag-and-drop or column movement task management with priority tags and completion counter.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Kanban</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-white">Project Sprint Board</h1>
      <button id="add-task-btn" class="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs">+ Add Task</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- To Do -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          To Do <span class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]" id="todo-count">0</span>
        </h2>
        <div id="col-todo" class="space-y-3"></div>
      </div>
      <!-- In Progress -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 class="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center justify-between">
          In Progress <span class="bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full text-[10px]" id="prog-count">0</span>
        </h2>
        <div id="col-prog" class="space-y-3"></div>
      </div>
      <!-- Done -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 class="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center justify-between">
          Done <span class="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]" id="done-count">0</span>
        </h2>
        <div id="col-done" class="space-y-3"></div>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'app.js',
        content: `let tasks = [
  { id: 1, title: 'Integrate CodeBERT Scanner', status: 'prog', priority: 'High' },
  { id: 2, title: 'Verify Gemini Grounding Citations', status: 'done', priority: 'Medium' },
  { id: 3, title: 'Test Vercel Deployment Schema', status: 'todo', priority: 'High' }
];

function renderTasks() {
  const todoCol = document.getElementById('col-todo');
  const progCol = document.getElementById('col-prog');
  const doneCol = document.getElementById('col-done');
  todoCol.innerHTML = ''; progCol.innerHTML = ''; doneCol.innerHTML = '';

  let cTodo = 0, cProg = 0, cDone = 0;

  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 shadow text-xs space-y-2';
    card.innerHTML = \`
      <div class="font-semibold text-slate-200">\${t.title}</div>
      <div class="flex justify-between items-center pt-2">
        <span class="px-2 py-0.5 rounded text-[10px] \${t.priority === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}">\${t.priority}</span>
        <div class="flex gap-1">
          \${t.status !== 'todo' ? \`<button class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px]" onclick="moveTask(\${t.id}, 'prev')">←</button>\` : ''}
          \${t.status !== 'done' ? \`<button class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px]" onclick="moveTask(\${t.id}, 'next')">→</button>\` : ''}
        </div>
      </div>
    \`;
    if (t.status === 'todo') { todoCol.appendChild(card); cTodo++; }
    else if (t.status === 'prog') { progCol.appendChild(card); cProg++; }
    else { doneCol.appendChild(card); cDone++; }
  });

  document.getElementById('todo-count').textContent = cTodo;
  document.getElementById('prog-count').textContent = cProg;
  document.getElementById('done-count').textContent = cDone;
}

window.moveTask = function(id, dir) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const flow = ['todo', 'prog', 'done'];
  const curIdx = flow.indexOf(task.status);
  const nextIdx = dir === 'next' ? curIdx + 1 : curIdx - 1;
  if (nextIdx >= 0 && nextIdx < flow.length) {
    task.status = flow[nextIdx];
    renderTasks();
  }
};

document.getElementById('add-task-btn').addEventListener('click', () => {
  const title = prompt('Enter task description:');
  if (title) {
    tasks.push({ id: Date.now(), title, status: 'todo', priority: 'Medium' });
    renderTasks();
  }
});

renderTasks();`,
      },
    ],
  },
  {
    id: 'shop-checkout',
    name: 'E-Commerce Cart & Checkout',
    category: 'E-Commerce',
    description: 'Shopping cart drawer with discount coupon validation, tax calculation, and order review.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CyberForge Hardware</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="border-b border-slate-800 pb-4 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-white">Cart & Checkout</h1>
      <span class="text-xs text-cyan-400 font-mono">Instant Sandbox Checkout</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2 space-y-4" id="cart-items">
        <!-- Cart Items -->
      </div>
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 h-fit space-y-4">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">Order Summary</h2>
        <div class="space-y-2 text-xs text-slate-400 border-b border-slate-800 pb-3">
          <div class="flex justify-between"><span>Subtotal</span><span id="subtotal" class="text-white">$0.00</span></div>
          <div class="flex justify-between"><span>Estimated Tax (8%)</span><span id="tax" class="text-white">$0.00</span></div>
          <div class="flex justify-between text-emerald-400"><span>Discount (GENFORGE)</span><span id="discount">-$15.00</span></div>
        </div>
        <div class="flex justify-between text-base font-bold text-white">
          <span>Total</span>
          <span id="grand-total" class="text-cyan-400">$0.00</span>
        </div>
        <button class="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition">Complete Order</button>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'app.js',
        content: `let cart = [
  { id: 1, name: 'GenForge Neural Accelerator PCIe', price: 299.00, qty: 1 },
  { id: 2, name: 'Precision Mechanical Macro Pad', price: 89.00, qty: 2 }
];

function updateSummary() {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.qty;
    const div = document.createElement('div');
    div.className = 'p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center';
    div.innerHTML = \`
      <div>
        <div class="font-bold text-white text-sm">\${item.name}</div>
        <div class="text-xs text-slate-400 mt-1">$\${item.price.toFixed(2)} each</div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-slate-400 font-mono">Qty: \${item.qty}</span>
        <span class="font-bold text-cyan-400 text-sm font-mono">$\${(item.price * item.qty).toFixed(2)}</span>
      </div>
    \`;
    container.appendChild(div);
  });

  const tax = subtotal * 0.08;
  const discount = 15.00;
  const total = Math.max(0, subtotal + tax - discount);

  document.getElementById('subtotal').textContent = \`$\${subtotal.toFixed(2)}\`;
  document.getElementById('tax').textContent = \`$\${tax.toFixed(2)}\`;
  document.getElementById('grand-total').textContent = \`$\${total.toFixed(2)}\`;
}

updateSummary();`,
      },
    ],
  },
  {
    id: 'intentionally-unsafe-sample',
    name: 'Vulnerable App (Scanner Demo)',
    category: 'Security Testing',
    badge: 'Dual-Signal Test',
    isUnsafeSample: true,
    description: 'Contains intentional DOM XSS, eval() injection, and hardcoded API keys to demonstrate the CodeBERT ML Model and AST Pattern cross-check in action.',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vulnerability Demonstration App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-6 font-sans">
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-6">
      <h1 class="text-xl font-bold text-rose-400 mb-2">⚠️ Intentional Vulnerability Sample</h1>
      <p class="text-xs text-rose-200">This project includes intentional security defects (CWE-79 innerHTML injection, CWE-95 eval, and CWE-798 hardcoded secret) to verify the dual-signal scanner.</p>
    </div>

    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <label class="text-xs text-slate-400">User Input String:</label>
      <input id="raw-input" type="text" value="<img src=x onerror=alert('xss')>" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white">
      <div class="flex gap-2">
        <button id="unsafe-sink-btn" class="px-4 py-2 bg-rose-600 rounded text-xs font-semibold">Render via innerHTML</button>
        <button id="eval-calc-btn" class="px-4 py-2 bg-amber-600 rounded text-xs font-semibold">Execute with eval()</button>
      </div>
      <div id="sink-output" class="p-4 bg-slate-950 rounded-xl border border-slate-800 min-h-[50px] text-xs"></div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: 'app.js',
        content: `// INTENTIONAL VULNERABILITY 1: Hardcoded Secret Key (CWE-798)
const api_key = "AIzaSyD-TEST-HARDCODED-SECRET-TOKEN-123456789";

const input = document.getElementById('raw-input');
const sink = document.getElementById('sink-output');
const btnSink = document.getElementById('unsafe-sink-btn');
const btnEval = document.getElementById('eval-calc-btn');

// INTENTIONAL VULNERABILITY 2: Unsafe DOM XSS via innerHTML (CWE-79)
if (btnSink) {
  btnSink.addEventListener('click', () => {
    sink.innerHTML = "Result: " + input.value;
  });
}

// INTENTIONAL VULNERABILITY 3: Arbitrary code evaluation via eval() (CWE-95)
if (btnEval) {
  btnEval.addEventListener('click', () => {
    try {
      const calculated = eval(input.value);
      sink.textContent = "Calculated: " + calculated;
    } catch (e) {
      sink.textContent = "Eval error: " + e.message;
    }
  });
}

console.log("Insecure sample loaded with API Key:", api_key);`,
      },
    ],
  },
];
