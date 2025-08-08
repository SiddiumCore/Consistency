// Storage schema in localStorage:
// key "dw-data" -> { entries: { "YYYY-MM-DD": { med: true/false, walk: true/false } } }

const el = (id) => document.getElementById(id);
const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-11
  data: loadData()
};

function loadData() {
  try {
    const raw = localStorage.getItem('dw-data'); // localStorage persists across sessions[7][10][16][13]
    if (!raw) return { entries: {} };
    const parsed = JSON.parse(raw);
    return parsed?.entries ? parsed : { entries: {} };
  } catch {
    return { entries: {} };
  }
}
function saveData() {
  localStorage.setItem('dw-data', JSON.stringify(state.data));
}

function ymd(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2,'0');
  const d = String(dateObj.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function setToday(type) {
  const today = ymd(new Date());
  const entry = state.data.entries[today] ?? { med:false, walk:false };
  if (type === 'med') entry.med = true;
  if (type === 'walk') entry.walk = true;
  state.data.entries[today] = entry;
  saveData();
  renderAll();
  flashButton(type);
}

function resetToday() {
  const today = ymd(new Date());
  delete state.data.entries[today];
  saveData();
  renderAll();
}

function monthLabel(y, m) {
  return new Date(y, m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function renderCalendar() {
  const cal = el('calendar');
  cal.innerHTML = '';

  const y = state.year, m = state.month;
  el('month-label').textContent = monthLabel(y, m);

  // Weekday headers (Mon-Sun)
  const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  weekdays.forEach(w => {
    const wEl = document.createElement('div');
    wEl.className = 'weekday';
    wEl.textContent = w;
    cal.appendChild(wEl);
  });

  const first = new Date(y, m, 1);
  const startIdx = (first.getDay() + 6) % 7; // make Monday=0
  const daysInMonth = new Date(y, m+1, 0).getDate();

  // leading blanks
  for (let i=0;i<startIdx;i++){
    const blank = document.createElement('div');
    cal.appendChild(blank);
  }

  const todayStr = ymd(new Date());

  for (let d=1; d<=daysInMonth; d++){
    const date = new Date(y, m, d);
    const key = ymd(date);
    const entry = state.data.entries[key];

    const cell = document.createElement('div');
    cell.className = 'day';
    if (key === todayStr) cell.classList.add('today');

    const num = document.createElement('div');
    num.className = 'dnum';
    num.textContent = d;

    const badges = document.createElement('div');
    badges.className = 'badges';

    if (entry?.med && entry?.walk) {
      const b = document.createElement('span'); b.className = 'badge both'; badges.appendChild(b);
    } else {
      if (entry?.med) { const b = document.createElement('span'); b.className = 'badge med'; badges.appendChild(b); }
      if (entry?.walk) { const b = document.createElement('span'); b.className = 'badge walk'; badges.appendChild(b); }
    }

    cell.appendChild(num);
    cell.appendChild(badges);
    cal.appendChild(cell);
  }
}

function getStats() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  let medMonth=0, walkMonth=0, medTotal=0, walkTotal=0;

  for (const [key, val] of Object.entries(state.data.entries)) {
    if (val.med) medTotal++;
    if (val.walk) walkTotal++;

    const dt = new Date(key);
    if (dt.getFullYear() === y && dt.getMonth() === m) {
      if (val.med) medMonth++;
      if (val.walk) walkMonth++;
    }
  }
  return { medMonth, walkMonth, medTotal, walkTotal };
}

function getStreak(type) {
  // Count consecutive days ending today where type is true
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const key = ymd(cur);
    const v = state.data.entries[key];
    if (v && v[type]) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderToday() {
  const today = ymd(new Date());
  const entry = state.data.entries[today];
  const medDone = !!entry?.med;
  const walkDone = !!entry?.walk;

  const parts = [];
  if (medDone && walkDone) parts.push('Meditation and Walk complete. Beautiful work.');
  else if (medDone) parts.push('Meditation done. A walk would be great.');
  else if (walkDone) parts.push('Walk done. A short meditation will feel good.');
  else parts.push('Make today count.');

  el('today-status').textContent = parts.join(' ');
  el('btn-meditation').classList.toggle('completed', medDone);
  el('btn-walk').classList.toggle('completed', walkDone);
}

function renderStats() {
  const s = getStats();
  el('med-month').textContent = s.medMonth;
  el('walk-month').textContent = s.walkMonth;
  el('med-total').textContent = s.medTotal;
  el('walk-total').textContent = s.walkTotal;

  el('med-streak').textContent = getStreak('med');
  el('walk-streak').textContent = getStreak('walk');
}

function flashButton(type){
  const btn = type === 'med' ? el('btn-meditation') : el('btn-walk');
  btn.animate(
    [{ transform:'scale(1)' }, { transform:'scale(1.04)' }, { transform:'scale(1)' }],
    { duration:260, easing:'ease-out' }
  );
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

function init(){
  el('today-date').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });
  attachEvents();
  renderAll();
}
document.addEventListener('DOMContentLoaded', init);
