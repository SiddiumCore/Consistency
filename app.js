// Storage: key "dw-data" -> { entries: { "YYYY-MM-DD": { med: bool, walk: bool, vit: bool } } }

const el = (id) => document.getElementById(id);
const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  data: loadData()
};

let deferredPrompt = null;

function loadData() {
  try {
    const raw = localStorage.getItem('dw-data');
    if (!raw) return { entries: {} };
    const parsed = JSON.parse(raw);
    if (parsed && parsed.entries) {
      for (const k of Object.keys(parsed.entries)) {
        if (typeof parsed.entries[k].vit === 'undefined') {
          parsed.entries[k].vit = false;
        }
      }
    }
    return parsed?.entries ? parsed : { entries: {} };
  } catch {
    return { entries: {} };
  }
}
function saveData() { localStorage.setItem('dw-data', JSON.stringify(state.data)); }
function ymd(dateObj){
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
}
function isAllComplete(entry){ return !!(entry.med && entry.walk && entry.vit); }

function setToday(type) {
  const today = ymd(new Date());
  const existing = state.data.entries[today] ?? { med:false, walk:false, vit:false };
  const wasAll = isAllComplete(existing);

  if (type === 'med') existing.med = true;
  if (type === 'walk') existing.walk = true;
  if (type === 'vit') existing.vit = true;

  state.data.entries[today] = existing;
  const nowAll = isAllComplete(existing);

  saveData();
  renderAll();
  flashButton(type);
  pulseStatus();

  if (!wasAll && nowAll) triggerConfettiCSS();

  maybeShowMilestone(type);
}

function resetToday() {
  const today = ymd(new Date());
  delete state.data.entries[today];
  saveData();
  renderAll();
}

function monthLabel(y, m) { return new Date(y, m, 1).toLocaleString(undefined, { month:'long', year:'numeric' }); }

function renderCalendar() {
  const cal = el('calendar'); cal.innerHTML = '';
  const y = state.year, m = state.month;
  el('month-label').textContent = monthLabel(y, m);

  const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  weekdays.forEach(w => {
    const wEl = document.createElement('div');
    wEl.className = 'weekday';
    wEl.textContent = w;
    cal.appendChild(wEl);
  });

  const first = new Date(y, m, 1);
  const startIdx = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayStr = ymd(new Date());

  for (let i=0;i<startIdx;i++){ cal.appendChild(document.createElement('div')); }

  for (let d=1; d<=daysInMonth; d++){
    const date = new Date(y, m, d);
    const key = ymd(date);
    const entry = state.data.entries[key] || { med:false, walk:false, vit:false };

    const cell = document.createElement('div');
    cell.className = 'day';
    if (key === todayStr) cell.classList.add('today');

    const count = (entry.med?1:0)+(entry.walk?1:0)+(entry.vit?1:0);
    if (count > 0) {
      if (count === 1) {
        if (entry.med) cell.classList.add('tint-med');
        else if (entry.walk) cell.classList.add('tint-walk');
        else if (entry.vit) cell.classList.add('tint-vit');
      } else {
        cell.classList.add('tint-mix');
      }
      cell.classList.add('tint-animated');
    }

    const num = document.createElement('div');
    num.className = 'dnum';
    num.textContent = d;

    const badges = document.createElement('div');
    badges.className = 'badges';
    if (entry.med) { const b = document.createElement('span'); b.className = 'badge med added'; badges.appendChild(b); }
    if (entry.walk){ const b = document.createElement('span'); b.className = 'badge walk added'; badges.appendChild(b); }
    if (entry.vit) { const b = document.createElement('span'); b.className = 'badge vit added'; badges.appendChild(b); }

    cell.appendChild(num);
    cell.appendChild(badges);
    cal.appendChild(cell);
  }
}

function getStats() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  let medMonth=0, walkMonth=0, vitMonth=0, medTotal=0, walkTotal=0, vitTotal=0;

  for (const [key, val] of Object.entries(state.data.entries)) {
    if (val.med) medTotal++;
    if (val.walk) walkTotal++;
    if (val.vit) vitTotal++;

    const dt = new Date(key);
    if (dt.getFullYear() === y && dt.getMonth() === m) {
      if (val.med) medMonth++;
      if (val.walk) walkMonth++;
      if (val.vit) vitMonth++;
    }
  }
  return { medMonth, walkMonth, vitMonth, medTotal, walkTotal, vitTotal };
}

function getStreak(type) {
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const key = ymd(cur);
    const v = state.data.entries[key];
    if (v && v[type]) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function renderToday() {
  const today = ymd(new Date());
  const entry = state.data.entries[today] || {};
  const medDone = !!entry.med;
  const walkDone = !!entry.walk;
  const vitDone = !!entry.vit;

  let msg = 'Make today count.';
  if (medDone && walkDone && vitDone) msg = 'Meditation, Walk, and Vitamin done. Amazing!';
  else if (medDone && walkDone) msg = 'Meditation and Walk done. Vitamin next?';
  else if (medDone && vitDone) msg = 'Meditation and Vitamin done. A walk would be great.';
  else if (walkDone && vitDone) msg = 'Walk and Vitamin done. A short meditation will feel good.';
  else if (medDone) msg = 'Meditation done. Walk and Vitamin left.';
  else if (walkDone) msg = 'Walk done. Meditation and Vitamin left.';
  else if (vitDone) msg = 'Vitamin done. Meditation or Walk next?';

  el('today-status').textContent = msg;

  const medBtn = el('btn-meditation');
  const walkBtn = el('btn-walk');
  const vitBtn = el('btn-vitamin');

  medBtn.classList.toggle('completed', medDone);
  walkBtn.classList.toggle('completed', walkDone);
  vitBtn.classList.toggle('completed', vitDone);

  medBtn.setAttribute('aria-pressed', String(medDone));
  walkBtn.setAttribute('aria-pressed', String(walkDone));
  vitBtn.setAttribute('aria-pressed', String(vitDone));
}

function renderStats() {
  const s = getStats();
  el('med-month').textContent = s.medMonth;
  el('walk-month').textContent = s.walkMonth;
  el('vit-month').textContent = s.vitMonth;
  el('med-total').textContent = s.medTotal;
  el('walk-total').textContent = s.walkTotal;
  el('vit-total').textContent = s.vitTotal;

  el('med-streak').textContent = getStreak('med');
  el('walk-streak').textContent = getStreak('walk');
  el('vit-streak').textContent = getStreak('vit');
}

function flashButton(type){
  const map = { med:'btn-meditation', walk:'btn-walk', vit:'btn-vitamin' };
  const btn = el(map[type]);
  if (!btn) return;
  btn.animate(
    [{ transform:'scale(1)' }, { transform:'scale(1.04)' }, { transform:'scale(1)' }],
    { duration:260, easing:'ease-out' }
  );
}

function pulseStatus(){
  const dot = document.getElementById('status-icon');
  dot.classList.add('status-glow');
  setTimeout(()=>dot.classList.remove('status-glow'), 600);
}

/* CSS confetti trigger: briefly add .active, then remove after animation */
function triggerConfettiCSS(){
  const layer = document.querySelector('.confetti-layer');
  if (!layer) return;
  layer.classList.remove('active'); // reset if still active
  // Force reflow to restart animations
  void layer.offsetHeight;
  layer.classList.add('active');
  // Remove after max duration (~2.2s)
  setTimeout(()=>layer.classList.remove('active'), 2200);
}

function maybeShowMilestone(type){
  const streak = getStreak(type);
  const thresholds = [7, 30, 100];
  if (thresholds.includes(streak)) {
    const box = el('milestone');
    const labels = { med:'Meditation', walk:'Walk', vit:'Vitamin' };
    box.textContent = `${labels[type]} streak: ${streak} days! Keep the rhythm.`;
    box.style.display = 'block';
    setTimeout(()=> box.style.display='none', 3500);
  }
}

function renderAll(){
  el('today-date').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });
  renderToday();
  renderCalendar();
  renderStats();
}

function moveMonth(delta) {
  let y = state.year;
  let m = state.month + delta;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11){ m = 0;  y += 1; }
  state.year = y; state.month = m;
  renderCalendar();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'daily-tracker-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(reader.result);
      if (obj && obj.entries && typeof obj.entries === 'object') {
        for (const k of Object.keys(obj.entries)) {
          if (typeof obj.entries[k].vit === 'undefined') obj.entries[k].vit = false;
        }
        state.data = obj;
        saveData();
        renderAll();
      } else {
        alert('Invalid JSON format.');
      }
    } catch {
      alert('Could not parse JSON.');
    }
  };
  reader.readAsText(file);
}

function attachEvents(){
  el('btn-meditation').addEventListener('click', () => setToday('med'));
  el('btn-walk').addEventListener('click', () => setToday('walk'));
  el('btn-vitamin').addEventListener('click', () => setToday('vit'));
  el('prev-month').addEventListener('click', () => moveMonth(-1));
  el('next-month').addEventListener('click', () => moveMonth(1));
  el('reset-day').addEventListener('click', resetToday);
  el('export-data').addEventListener('click', exportData);
  el('import-data').addEventListener('click', () => el('import-file').click());
  el('import-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = '';
  });
}

function registerSW(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}

function init(){
  el('today-date').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });
  attachEvents();
  renderAll();
  registerSW();
}
document.addEventListener('DOMContentLoaded', init);
