/* ===================================================
   SortLab — Sorting Algorithm Visualizer
   DOM-based immersive rendering engine
   =================================================== */

// ── Algorithm Registry ────────────────────────────
const ALGORITHMS = {
  bubble: {
    name: 'Bubble Sort', color: '#fa6d8a',
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true }
  },
  selection: {
    name: 'Selection Sort', color: '#fac96d',
    complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false }
  },
  insertion: {
    name: 'Insertion Sort', color: '#6dfac5',
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true }
  },
  merge: {
    name: 'Merge Sort', color: '#6db8fa',
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true }
  },
  quick: {
    name: 'Quick Sort', color: '#7c6dfa',
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false }
  },
  heap: {
    name: 'Heap Sort', color: '#fa6dfa',
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false }
  },
  counting: {
    name: 'Counting Sort', color: '#4affa3',
    complexity: { best: 'O(n+k)', avg: 'O(n+k)', worst: 'O(n+k)', space: 'O(k)', stable: true }
  },
  radix: {
    name: 'Radix Sort', color: '#ff9f4a',
    complexity: { best: 'O(nk)', avg: 'O(nk)', worst: 'O(nk)', space: 'O(n+k)', stable: true }
  },
  bucket: {
    name: 'Bucket Sort', color: '#4af0ff',
    complexity: { best: 'O(n+k)', avg: 'O(n+k)', worst: 'O(n²)', space: 'O(n)', stable: true }
  },
  shell: {
    name: 'Shell Sort', color: '#ff4af0',
    complexity: { best: 'O(n log n)', avg: 'O(n log²n)', worst: 'O(n²)', space: 'O(1)', stable: false }
  }
};

// ── State ─────────────────────────────────────────
const state = {
  array: [],
  arraySize: 40,
  speed: 5,
  pattern: 'random',
  mode: 'single',
  selectedAlgos: ['bubble'],
  sorting: false,
  paused: false,
  pauseResolvers: [],
  cancelFlags: {}
};

// ── Utility ───────────────────────────────────────
function getDelay() {
  return Math.max(2, Math.round(200 / Math.pow(state.speed, 1.4)));
}

function delay(ms) {
  return new Promise(resolve => {
    if (state.paused) {
      state.pauseResolvers.push(resolve);
    } else {
      setTimeout(resolve, ms);
    }
  });
}

function resumePaused() {
  const resolvers = [...state.pauseResolvers];
  state.pauseResolvers = [];
  resolvers.forEach(r => setTimeout(r, getDelay()));
}

function shouldCancel(id) {
  return state.cancelFlags[id] === true;
}

// ── Array Generators ──────────────────────────────
function generateArray(size, pattern) {
  let arr;
  switch (pattern) {
    case 'nearly-sorted':
      arr = Array.from({ length: size }, (_, i) => Math.round((i + 1) * (100 / size)));
      for (let i = 0; i < Math.max(2, Math.floor(size * 0.05)); i++) {
        const a = Math.floor(Math.random() * size);
        const b = Math.floor(Math.random() * size);
        [arr[a], arr[b]] = [arr[b], arr[a]];
      }
      break;
    case 'reversed':
      arr = Array.from({ length: size }, (_, i) => Math.round((size - i) * (100 / size)));
      break;
    case 'few-unique':
      const uniq = Math.max(2, Math.floor(size / 8));
      const vals = Array.from({ length: uniq }, (_, i) => Math.round((i + 1) * (100 / uniq)));
      arr = Array.from({ length: size }, () => vals[Math.floor(Math.random() * uniq)]);
      break;
    default:
      arr = Array.from({ length: size }, () => Math.ceil(Math.random() * 100));
  }
  return arr;
}

// ── DOM Bar Engine ────────────────────────────────
function initBars(p) {
  const wrap = p.wrap;
  if (!wrap) return;
  wrap.innerHTML = '';
  p.barEls = [];
  const n = p.arr.length;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'bar-el s-default';
    const inner = document.createElement('div');
    inner.className = 'bar-el-inner';
    el.appendChild(inner);
    wrap.appendChild(el);
    p.barEls.push(el);
  }
}

function renderBars(p, highlights = {}, sortedSet = new Set()) {
  const wrap = p.wrap;
  if (!wrap || !p.barEls || p.barEls.length === 0) return;

  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  const n = p.arr.length;
  if (n === 0 || W === 0 || H === 0) return;

  const gap = n > 80 ? 0 : n > 40 ? 1 : 2;
  const barW = Math.max(1, (W - gap * (n - 1)) / n);

  for (let i = 0; i < n; i++) {
    const el = p.barEls[i];
    if (!el) continue;
    const val = p.arr[i];
    const barH = Math.max(2, (val / 100) * H);
    const xPos = i * (barW + gap);

    el.style.width = barW + 'px';
    el.style.height = H + 'px';
    el.style.transform = `translateX(${xPos}px)`;
    el.firstChild.style.height = barH + 'px';

    // Determine state class
    let cls = 's-default';
    if (p.placedSet && p.placedSet.has(i))              cls = 's-placed';
    else if (sortedSet.has(i))                          cls = 's-sorted';
    else if (highlights.reading && highlights.reading.has(i)) cls = 's-reading';
    else if (highlights.compare && highlights.compare.has(i)) cls = 's-compare';
    else if (highlights.pivot   && highlights.pivot.has(i))   cls = 's-pivot';
    else if (highlights.swap    && highlights.swap.has(i))    cls = 's-swap';
    else if (highlights.write   && highlights.write.has(i))   cls = 's-write';

    el.className = 'bar-el ' + cls;
  }
}

// ── Panel Manager ─────────────────────────────────
const panels = {};

function createPanel(algoKey, stageEl) {
  const algo = ALGORITHMS[algoKey];
  const panel = document.createElement('div');
  panel.className = 'viz-panel';
  panel.id = `panel-${algoKey}`;
  panel.style.setProperty('--algo-color', algo.color);

  panel.innerHTML = `
    <div class="viz-panel-header">
      <div class="viz-algo-name" style="color:${algo.color}">${algo.name}</div>
      <div class="viz-live-stats">
        <div class="viz-stat">Comparisons: <span id="cmp-${algoKey}">0</span></div>
        <div class="viz-stat">Swaps: <span id="swp-${algoKey}">0</span></div>
        <div class="viz-stat">Time: <span id="time-${algoKey}">—</span></div>
      </div>
    </div>
    <div class="viz-bars-wrap" id="wrap-${algoKey}"></div>
    <div class="viz-status-bar">
      <div class="status-dot" id="dot-${algoKey}"></div>
      <span id="msg-${algoKey}">Ready</span>
    </div>
    <div class="viz-progress">
      <div class="viz-progress-fill" id="prog-${algoKey}" style="background:${algo.color}"></div>
    </div>
  `;

  stageEl.appendChild(panel);

  panels[algoKey] = {
    panel,
    wrap: panel.querySelector('.viz-bars-wrap'),
    barEls: [],
    arr: [...state.array],
    sortedSet: new Set(),
    placedSet: new Set(),       // tracks bars currently showing the placed-flash
    comparisons: 0, swaps: 0,
    startTime: null, endTime: null,
    done: false
  };

  return panels[algoKey];
}

function updatePanelStats(key) {
  const p = panels[key];
  if (!p) return;
  const cmpEl = document.getElementById(`cmp-${key}`);
  const swpEl = document.getElementById(`swp-${key}`);
  const timeEl = document.getElementById(`time-${key}`);
  if (cmpEl) cmpEl.textContent = p.comparisons.toLocaleString();
  if (swpEl) swpEl.textContent = p.swaps.toLocaleString();
  if (timeEl && p.startTime && !p.endTime)
    timeEl.textContent = ((performance.now() - p.startTime) / 1000).toFixed(2) + 's';
}

function setStatus(key, status, msg) {
  const dot = document.getElementById(`dot-${key}`);
  const msgEl = document.getElementById(`msg-${key}`);
  if (dot) dot.className = `status-dot ${status}`;
  if (msgEl) msgEl.textContent = msg;
}

function setProgress(key, pct) {
  const el = document.getElementById(`prog-${key}`);
  if (el) el.style.width = pct + '%';
}

// ── Animated Sort Wrapper ─────────────────────────
async function animatedSort(key, sortFn) {
  const p = panels[key];
  if (!p) return;

  p.comparisons = 0; p.swaps = 0;
  p.sortedSet = new Set();
  p.placedSet = new Set();
  p.arr = [...state.array];
  p.startTime = performance.now();
  p.endTime = null;
  p.done = false;

  setStatus(key, 'running', 'Sorting…');
  state.cancelFlags[key] = false;

  async function draw(highlights, progress) {
    if (shouldCancel(key)) throw new Error('cancelled');
    if (state.paused) {
      await new Promise(res => state.pauseResolvers.push(res));
    }
    renderBars(p, highlights, p.sortedSet);
    updatePanelStats(key);
    if (progress !== undefined) setProgress(key, progress);
    await delay(getDelay());
  }

  async function markSorted(indices) {
    // Flash the placed color, then after 350ms settle to sorted (= default)
    indices.forEach(i => {
      p.placedSet.add(i);
      p.sortedSet.add(i);
    });
    renderBars(p, {}, p.sortedSet);
    await delay(350);
    indices.forEach(i => p.placedSet.delete(i));
  }

  // Wrap sortedSet.add to trigger the placed flash
  const origSortedAdd = p.sortedSet.add.bind(p.sortedSet);
  let pendingPlaced = [];
  p.sortedSet = new Proxy(new Set(), {
    get(target, prop) {
      if (prop === 'add') {
        return (v) => {
          if (!target.has(v)) {
            target.add(v);
            p.placedSet.add(v);
            setTimeout(() => p.placedSet.delete(v), 350);
          }
          return target;
        };
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });

  try {
    await sortFn(p, draw);
    p.sortedSet = new Set(Array.from({ length: p.arr.length }, (_, i) => i));
    p.endTime = performance.now();
    p.done = true;
    renderBars(p, {}, p.sortedSet);
    setProgress(key, 100);
    const elapsed = ((p.endTime - p.startTime) / 1000).toFixed(3);
    setStatus(key, 'done', `Done in ${elapsed}s`);
    const timeEl = document.getElementById(`time-${key}`);
    if (timeEl) timeEl.textContent = elapsed + 's';
    panels[key].panel.classList.add('done');
    updateStatsDashboard();
  } catch (e) {
    if (e.message !== 'cancelled') console.error(e);
    setStatus(key, '', 'Cancelled');
  }
}

// ══════════════════════════════════════════════════
//   SORTING ALGORITHMS
// ══════════════════════════════════════════════════

async function bubbleSort(p, draw) {
  const arr = p.arr, n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      p.comparisons++;
      await draw({ compare: new Set([j, j + 1]) }, Math.round(((i * n + j) / (n * n)) * 100));
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        p.swaps++;
        await draw({ swap: new Set([j, j + 1]) });
      }
    }
    p.sortedSet.add(n - 1 - i);
  }
  p.sortedSet.add(0);
}

async function selectionSort(p, draw) {
  const arr = p.arr, n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      p.comparisons++;
      await draw({ compare: new Set([j, minIdx]), reading: new Set([i]) }, Math.round((i / n) * 100));
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      p.swaps++;
      await draw({ swap: new Set([i, minIdx]) });
    }
    p.sortedSet.add(i);
  }
  p.sortedSet.add(n - 1);
}

async function insertionSort(p, draw) {
  const arr = p.arr, n = arr.length;
  p.sortedSet.add(0);
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    await draw({ reading: new Set([i]) }, Math.round((i / n) * 100));
    while (j >= 0) {
      p.comparisons++;
      await draw({ compare: new Set([j, j + 1]) });
      if (arr[j] > key) {
        arr[j + 1] = arr[j];
        p.swaps++;
        await draw({ write: new Set([j + 1]) });
        j--;
      } else break;
    }
    arr[j + 1] = key;
    p.sortedSet.add(i);
    await draw({ write: new Set([j + 1]) });
  }
}

async function mergeSort(p, draw) {
  async function merge(arr, l, m, r) {
    const left = arr.slice(l, m + 1);
    const right = arr.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    while (i < left.length && j < right.length) {
      p.comparisons++;
      await draw({ compare: new Set([l + i, m + 1 + j]) }, Math.round((k / arr.length) * 100));
      if (left[i] <= right[j]) { arr[k++] = left[i++]; }
      else { arr[k++] = right[j++]; p.swaps++; }
      await draw({ write: new Set([k - 1]) });
    }
    while (i < left.length) { arr[k++] = left[i++]; await draw({ write: new Set([k - 1]) }); }
    while (j < right.length) { arr[k++] = right[j++]; await draw({ write: new Set([k - 1]) }); }
    for (let x = l; x <= r; x++) p.sortedSet.add(x);
  }
  async function sort(arr, l, r) {
    if (l >= r) { p.sortedSet.add(l); return; }
    const m = Math.floor((l + r) / 2);
    await sort(arr, l, m);
    await sort(arr, m + 1, r);
    await merge(arr, l, m, r);
  }
  await sort(p.arr, 0, p.arr.length - 1);
}

async function quickSort(p, draw) {
  async function partition(arr, low, high) {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      p.comparisons++;
      await draw({ pivot: new Set([high]), compare: new Set([j, i + 1]) }, Math.round((low / arr.length) * 100));
      if (arr[j] <= pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        p.swaps++;
        await draw({ pivot: new Set([high]), swap: new Set([i, j]) });
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    p.swaps++;
    await draw({ swap: new Set([i + 1, high]) });
    return i + 1;
  }
  async function sort(arr, low, high) {
    if (low >= high) { if (low === high) p.sortedSet.add(low); return; }
    const pi = await partition(arr, low, high);
    p.sortedSet.add(pi);
    await sort(arr, low, pi - 1);
    await sort(arr, pi + 1, high);
  }
  await sort(p.arr, 0, p.arr.length - 1);
}

async function heapSort(p, draw) {
  const arr = p.arr, n = arr.length;
  async function heapify(arr, size, i) {
    let largest = i;
    const l = 2 * i + 1, r = 2 * i + 2;
    p.comparisons++;
    await draw({ compare: new Set([i, l, r].filter(x => x < size)) });
    if (l < size && arr[l] > arr[largest]) largest = l;
    if (r < size && arr[r] > arr[largest]) largest = r;
    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      p.swaps++;
      await draw({ swap: new Set([i, largest]) });
      await heapify(arr, size, largest);
    }
  }
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    await heapify(arr, n, i);
    await draw({}, Math.round(((n / 2 - i) / (n / 2)) * 50));
  }
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    p.swaps++;
    p.sortedSet.add(i);
    await draw({ swap: new Set([0, i]) }, 50 + Math.round(((n - i) / n) * 50));
    await heapify(arr, i, 0);
  }
  p.sortedSet.add(0);
}

async function countingSort(p, draw) {
  const arr = p.arr, n = arr.length;
  const max = Math.max(...arr);
  const count = new Array(max + 1).fill(0);
  for (let i = 0; i < n; i++) {
    p.comparisons++;
    count[arr[i]]++;
    await draw({ reading: new Set([i]) }, Math.round((i / n) * 50));
  }
  let idx = 0;
  for (let v = 0; v <= max; v++) {
    while (count[v]-- > 0) {
      arr[idx] = v;
      p.swaps++;
      p.sortedSet.add(idx);
      await draw({ write: new Set([idx]) }, 50 + Math.round((idx / n) * 50));
      idx++;
    }
  }
}

async function radixSort(p, draw) {
  const arr = p.arr, n = arr.length;
  const max = Math.max(...arr);
  async function countByDigit(exp) {
    const output = new Array(n);
    const count = new Array(10).fill(0);
    for (let i = 0; i < n; i++) { count[Math.floor(arr[i] / exp) % 10]++; p.comparisons++; await draw({ reading: new Set([i]) }); }
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = n - 1; i >= 0; i--) output[--count[Math.floor(arr[i] / exp) % 10]] = arr[i];
    for (let i = 0; i < n; i++) { arr[i] = output[i]; p.swaps++; p.sortedSet.add(i); await draw({ write: new Set([i]) }); }
  }
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) await countByDigit(exp);
}

async function bucketSort(p, draw) {
  const arr = p.arr, n = arr.length;
  const max = Math.max(...arr);
  const bCnt = Math.ceil(Math.sqrt(n));
  const buckets = Array.from({ length: bCnt }, () => []);
  for (let i = 0; i < n; i++) {
    buckets[Math.floor((arr[i] / (max + 1)) * bCnt)].push(arr[i]);
    p.comparisons++;
    await draw({ reading: new Set([i]) }, Math.round((i / n) * 40));
  }
  for (let b of buckets) b.sort((a, c) => a - c);
  let idx = 0;
  for (let b of buckets) for (const val of b) {
    arr[idx] = val; p.swaps++; p.sortedSet.add(idx);
    await draw({ write: new Set([idx]) }, 40 + Math.round((idx / n) * 60));
    idx++;
  }
}

async function shellSort(p, draw) {
  const arr = p.arr, n = arr.length;
  let gap = Math.floor(n / 2);
  while (gap > 0) {
    for (let i = gap; i < n; i++) {
      const temp = arr[i]; let j = i;
      while (j >= gap) {
        p.comparisons++;
        await draw({ compare: new Set([j, j - gap]) }, Math.round(((1 - gap / n) * 0.9) * 100));
        if (arr[j - gap] > temp) { arr[j] = arr[j - gap]; p.swaps++; await draw({ write: new Set([j]) }); j -= gap; }
        else break;
      }
      arr[j] = temp;
      await draw({ write: new Set([j]) });
    }
    gap = Math.floor(gap / 2);
  }
  for (let i = 0; i < arr.length; i++) p.sortedSet.add(i);
}

const SORT_FUNCTIONS = {
  bubble: bubbleSort, selection: selectionSort, insertion: insertionSort,
  merge: mergeSort, quick: quickSort, heap: heapSort,
  counting: countingSort, radix: radixSort, bucket: bucketSort, shell: shellSort
};

// ══════════════════════════════════════════════════
//   UI LOGIC
// ══════════════════════════════════════════════════

function buildAlgoGrid() {
  const grid = document.getElementById('algo-grid');
  grid.innerHTML = '';
  Object.entries(ALGORITHMS).forEach(([key, algo]) => {
    const card = document.createElement('div');
    card.className = 'algo-card' + (state.selectedAlgos.includes(key) ? ' selected' : '');
    card.dataset.key = key;
    card.style.setProperty('--algo-color', algo.color);
    card.innerHTML = `
      <div class="algo-check">✓</div>
      <div class="algo-name">${algo.name}</div>
      <div class="algo-complexity">${algo.complexity.avg}</div>
    `;
    card.addEventListener('click', () => toggleAlgo(key, card));
    grid.appendChild(card);
  });
}

function toggleAlgo(key, card) {
  if (state.sorting) return;
  const maxSelect = state.mode === 'single' ? 1 : state.mode === 'compare' ? 2 : 10;
  const idx = state.selectedAlgos.indexOf(key);
  if (idx !== -1) {
    if (state.selectedAlgos.length <= 1) { showToast('At least one algorithm must be selected'); return; }
    state.selectedAlgos.splice(idx, 1);
    card.classList.remove('selected');
  } else {
    if (state.selectedAlgos.length >= maxSelect) {
      if (maxSelect === 1) {
        const oldKey = state.selectedAlgos[0];
        state.selectedAlgos = [];
        document.querySelector(`[data-key="${oldKey}"]`)?.classList.remove('selected');
      } else {
        showToast(`Max ${maxSelect} algorithms in ${state.mode} mode`); return;
      }
    }
    state.selectedAlgos.push(key);
    card.classList.add('selected');
  }
  renderArray();
}

function buildComplexityTable() {
  const tbody = document.getElementById('complexity-body');
  tbody.innerHTML = '';
  Object.entries(ALGORITHMS).forEach(([key, algo]) => {
    const c = algo.complexity;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="algo-color-dot" style="background:${algo.color}"></span>${algo.name}</td>
      <td>${getBadge(c.best)}</td>
      <td>${getBadge(c.avg)}</td>
      <td>${getBadge(c.worst)}</td>
      <td><span class="badge badge-mid">${c.space}</span></td>
      <td><span class="badge ${c.stable ? 'badge-yes' : 'badge-no'}">${c.stable ? 'Yes' : 'No'}</span></td>
    `;
    tbody.appendChild(row);
  });
}

function getBadge(str) {
  let cls = 'badge-mid';
  if (str.includes('n²') || (str.includes('nk') && str.length > 4)) cls = 'badge-bad';
  else if (str.includes('log n') || str.includes('n log')) cls = 'badge-good';
  else if (str === 'O(n)' || str.includes('n+k')) cls = 'badge-good';
  return `<span class="badge ${cls}">${str}</span>`;
}

function updateStatsDashboard() {
  const dash = document.getElementById('stats-dashboard');
  const active = state.selectedAlgos.filter(k => panels[k]);
  if (!active.length) { dash.innerHTML = ''; return; }

  const legendColors = {
    default:  '#4a4a6a',
    compare:  '#ffcc00',
    swap:     '#ff2d55',
    sorted:   '#4affa3',
    placed:   '#00ffc8',
    pivot:    '#c084fc',
    reading:  '#38bdf8',
    write:    '#f472b6'
  };
  let html = `<div class="legend">
    <span class="legend-title">Legend</span>
    ${Object.entries(legendColors).map(([name, color]) =>
      `<div class="legend-item"><div class="legend-dot" style="background:${color}"></div>${name}</div>`
    ).join('')}
  </div>`;

  html += `<div class="stats-row">`;
  active.forEach(key => {
    const p = panels[key];
    if (!p) return;
    const algo = ALGORITHMS[key];
    const elapsed = p.endTime && p.startTime
      ? ((p.endTime - p.startTime) / 1000).toFixed(3) + 's'
      : p.startTime ? 'Running…' : '—';
    html += `
      <div class="stat-card" style="--algo-color:${algo.color}">
        <div class="stat-algo">${algo.name}</div>
        <div class="stat-metrics">
          <div class="stat-metric"><label>Comparisons</label><div class="val">${p.comparisons.toLocaleString()}</div></div>
          <div class="stat-metric"><label>Swaps/Writes</label><div class="val">${p.swaps.toLocaleString()}</div></div>
          <div class="stat-metric"><label>Time</label><div class="val">${elapsed}</div></div>
          <div class="stat-metric"><label>Array Size</label><div class="val">${state.arraySize}</div></div>
        </div>
      </div>`;
  });
  html += `</div>`;
  dash.innerHTML = html;
}

function buildStage() {
  const stage = document.getElementById('visualizer-stage');
  stage.innerHTML = '';
  Object.keys(panels).forEach(k => delete panels[k]);
  stage.className = `visualizer-stage mode-${state.mode}`;

  if (state.selectedAlgos.length === 0) {
    stage.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⬡</div>
      <div class="empty-msg">Select at least one algorithm to begin</div>
    </div>`;
    return;
  }

  state.selectedAlgos.forEach(key => createPanel(key, stage));

  // Wait for layout then init and render bars
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      state.selectedAlgos.forEach(key => {
        const p = panels[key];
        if (p) { initBars(p); renderBars(p, {}, new Set()); }
      });
    });
  });
}

function renderArray() {
  state.array = generateArray(state.arraySize, state.pattern);
  buildStage();
  document.getElementById('stats-dashboard').innerHTML = '';
}

async function startSorting() {
  if (state.sorting) return;
  if (state.selectedAlgos.length === 0) { showToast('Select at least one algorithm'); return; }

  state.sorting = true;
  state.paused = false;
  document.getElementById('btn-sort').disabled = true;
  document.getElementById('btn-generate').disabled = true;
  document.getElementById('btn-pause').disabled = false;

  const baseArr = [...state.array];
  state.selectedAlgos.forEach(key => { if (panels[key]) panels[key].arr = [...baseArr]; });

  const ticker = setInterval(() => {
    state.selectedAlgos.forEach(key => {
      const p = panels[key];
      if (p && p.startTime && !p.endTime) {
        const el = document.getElementById(`time-${key}`);
        if (el) el.textContent = ((performance.now() - p.startTime) / 1000).toFixed(2) + 's';
      }
    });
  }, 100);

  const promises = state.selectedAlgos.map(key => {
    const fn = SORT_FUNCTIONS[key];
    if (!fn) return Promise.resolve();
    return animatedSort(key, fn);
  });

  await Promise.allSettled(promises);

  clearInterval(ticker);
  state.sorting = false;
  state.paused = false;
  document.getElementById('btn-sort').disabled = false;
  document.getElementById('btn-generate').disabled = false;
  document.getElementById('btn-pause').disabled = true;
  document.getElementById('btn-pause').innerHTML = '<span class="btn-icon">⏸</span> Pause';
  updateStatsDashboard();
}

function togglePause() {
  if (!state.sorting) return;
  state.paused = !state.paused;
  const btn = document.getElementById('btn-pause');
  if (state.paused) {
    btn.innerHTML = '<span class="btn-icon">▶</span> Resume';
    state.selectedAlgos.forEach(k => setStatus(k, 'paused', 'Paused'));
  } else {
    btn.innerHTML = '<span class="btn-icon">⏸</span> Pause';
    state.selectedAlgos.forEach(k => setStatus(k, 'running', 'Sorting…'));
    resumePaused();
  }
}

function resetAll() {
  state.selectedAlgos.forEach(k => { state.cancelFlags[k] = true; });
  state.pauseResolvers.forEach(r => r());
  state.pauseResolvers = [];
  state.paused = false;
  state.sorting = false;
  document.getElementById('btn-sort').disabled = false;
  document.getElementById('btn-generate').disabled = false;
  document.getElementById('btn-pause').disabled = true;
  document.getElementById('btn-pause').innerHTML = '<span class="btn-icon">⏸</span> Pause';
  setTimeout(() => renderArray(), 50);
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Event Listeners ───────────────────────────────
document.getElementById('array-size').addEventListener('input', e => {
  state.arraySize = +e.target.value;
  document.getElementById('size-display').textContent = state.arraySize;
  if (!state.sorting) renderArray();
});

document.getElementById('speed').addEventListener('input', e => {
  state.speed = +e.target.value;
  document.getElementById('speed-display').textContent = state.speed;
});

document.querySelectorAll('.pattern-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.pattern = btn.dataset.pattern;
    if (!state.sorting) renderArray();
  });
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.sorting) return;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    if (state.mode === 'single' && state.selectedAlgos.length > 1) {
      state.selectedAlgos = [state.selectedAlgos[0]];
    } else if (state.mode === 'compare' && state.selectedAlgos.length > 2) {
      state.selectedAlgos = state.selectedAlgos.slice(0, 2);
    } else if (state.mode === 'race' && state.selectedAlgos.length < 2) {
      const toAdd = Object.keys(ALGORITHMS).filter(k => !state.selectedAlgos.includes(k));
      state.selectedAlgos.push(...toAdd.slice(0, 4));
    }
    buildAlgoGrid();
    renderArray();
  });
});

document.getElementById('btn-generate').addEventListener('click', () => { if (!state.sorting) renderArray(); });
document.getElementById('btn-sort').addEventListener('click', startSorting);
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-reset').addEventListener('click', resetAll);

window.addEventListener('resize', () => {
  state.selectedAlgos.forEach(key => {
    const p = panels[key];
    if (p && p.wrap) renderBars(p, {}, p.sortedSet || new Set());
  });
});

// ── Init ──────────────────────────────────────────
buildAlgoGrid();
buildComplexityTable();
renderArray();
