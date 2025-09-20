// app.js — perbaikan: semua jam tampil & sheet terbuka default

const PRESET_ZONES = [
  ["UTC","UTC"],
  ["London","Europe/London"],
  ["New York","America/New_York"],
  ["Los Angeles","America/Los_Angeles"],
  ["Paris","Europe/Paris"],
  ["Berlin","Europe/Berlin"],
  ["Moscow","Europe/Moscow"],
  ["Dubai","Asia/Dubai"],
  ["Mumbai","Asia/Kolkata"],
  ["Jakarta","Asia/Jakarta"],
  ["Singapore","Asia/Singapore"],
  ["Tokyo","Asia/Tokyo"],
  ["Sydney","Australia/Sydney"],
  ["Cairo","Africa/Cairo"],
  ["Nairobi","Africa/Nairobi"],
  ["São Paulo","America/Sao_Paulo"],
  ["Honolulu","Pacific/Honolulu"]
];

const localClockEl = document.querySelector('#localClock');
const clocksListEl = document.querySelector('#clocksList');
const tzSearchEl = document.querySelector('#tzSearch');
const presetSelect = document.querySelector('#presetTz');
const addBtn = document.querySelector('#addTz');
const btnTop = document.querySelector('#btnTop');

const sheet = document.getElementById('sheet');
const sheetHandle = document.getElementById('sheetHandle');

(function populateSelect(){
  PRESET_ZONES.forEach(([label, id])=>{
    const o = document.createElement('option');
    o.value = id; o.textContent = `${label} — ${id}`;
    presetSelect.appendChild(o);
  });
})();

function makeClockCard(label, zoneId){
  const el = document.createElement('div'); el.className = 'clock-card';
  el.innerHTML = `
    <div class="city">${label}</div>
    <div class="tz">${zoneId}</div>
    <div class="time">--:--:--</div>
    <div class="meta">---</div>
  `;
  el._zoneId = zoneId;
  return el;
}

const cards = [];
const zoneSet = new Set(); // mencegah duplikat

function addClock(label, zoneSpec){
  if(zoneSet.has(zoneSpec)) return null; // already added
  const card = makeClockCard(label, zoneSpec);
  clocksListEl.appendChild(card);
  cards.push(card);
  zoneSet.add(zoneSpec);
  return card;
}

function addPresetCards(){
  PRESET_ZONES.forEach(([label,id])=>{
    addClock(label, id);
  });
}
addPresetCards();

// Utility: try to format with Intl; return {time, meta}
function formatForZone(now, zone){
  try{
    if(!zone) throw new Error('no zone');
    // Normalize special-case "UTC"
    if(String(zone).toUpperCase() === 'UTC'){
      const timeText = now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
      return { time: timeText, meta: 'UTC' };
    }
    // Format time
    const timeText = new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: '2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now);
    // try to get tz name (may vary by browser)
    let tzName = '';
    try {
      const parts = new Intl.DateTimeFormat(undefined, { timeZone: zone, timeZoneName: 'short' }).formatToParts(now);
      tzName = parts.find(p=>p.type==='timeZoneName')?.value || '';
    } catch(e) {
      tzName = '';
    }
    return { time: timeText, meta: tzName || zone };
  } catch(e){
    return { time: '—', meta: 'Invalid zone' };
  }
}

function updateAll(){
  const now = new Date();
  // local
  try{
    localClockEl.querySelector('.time').textContent = now.toLocaleTimeString();
    localClockEl.querySelector('.date').textContent = now.toLocaleDateString();
  } catch(e){ /* ignore */ }

  // all cards
  for(const c of cards){
    const zone = c._zoneId;
    const formatted = formatForZone(now, zone);
    const timeEl = c.querySelector('.time');
    const metaEl = c.querySelector('.meta');
    if(timeEl) timeEl.textContent = formatted.time;
    if(metaEl) metaEl.textContent = formatted.meta;
  }
}
updateAll();
setInterval(updateAll, 1000);

// add button
addBtn.addEventListener('click', ()=>{
  const search = tzSearchEl.value.trim();
  const pick = presetSelect.value;
  if(search){
    addClock(search, search);
    tzSearchEl.value = '';
  } else if(pick){
    const lab = (PRESET_ZONES.find(p=>p[1]===pick)||[pick])[0];
    addClock(lab, pick);
    presetSelect.value = '';
  }
});

// Top button
btnTop.addEventListener('click', ()=> window.scrollTo({top:0,behavior:'smooth'}));
tzSearchEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addBtn.click(); });

// ---------------- Bottom sheet drag behavior (open by default) ---------------
let startY = 0;
let currentY = 0;
let dragging = false;
const vh = window.innerHeight;
const collapsedY = vh * 0.56;
const halfY = vh * 0.28;
const openY = vh * 0.06;

function setSheetTranslate(y){
  y = Math.max(openY, Math.min(collapsedY, y));
  sheet.style.transform = `translateY(${y}px)`;
  currentY = y;
}

// initialize OPEN by default so all clocks visible
sheet.classList.remove('collapsed','half'); sheet.classList.add('open');
setSheetTranslate(openY);

function startDrag(e){
  dragging = true;
  startY = (e.touches ? e.touches[0].clientY : e.clientY);
  sheet.style.transition = 'none';
}
function moveDrag(e){
  if(!dragging) return;
  const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
  const dy = clientY - startY;
  startY = clientY;
  let next = currentY + dy;
  setSheetTranslate(next);
}
function endDrag(e){
  if(!dragging) return;
  dragging = false;
  sheet.style.transition = '';
  const mid1 = (collapsedY + halfY) / 2;
  const mid2 = (halfY + openY) / 2;
  if(currentY > mid1) { sheet.classList.add('collapsed'); sheet.classList.remove('half','open'); setSheetTranslate(collapsedY); }
  else if(currentY > mid2) { sheet.classList.add('half'); sheet.classList.remove('collapsed','open'); setSheetTranslate(halfY); }
  else { sheet.classList.add('open'); sheet.classList.remove('collapsed','half'); setSheetTranslate(openY); }
}

sheetHandle.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);
sheetHandle.addEventListener('touchstart', startDrag, {passive:false});
window.addEventListener('touchmove', moveDrag, {passive:false});
window.addEventListener('touchend', endDrag);

// click to toggle
sheetHandle.addEventListener('click', (e)=>{
  if(dragging) return;
  if(sheet.classList.contains('open')){ sheet.classList.remove('open'); sheet.classList.add('half'); setSheetTranslate(halfY); }
  else if(sheet.classList.contains('half')){ sheet.classList.remove('half'); sheet.classList.add('collapsed'); setSheetTranslate(collapsedY); }
  else { sheet.classList.remove('collapsed'); sheet.classList.add('open'); setSheetTranslate(openY); }
});

window.addEventListener('resize', ()=> {
  // recompute sizes and keep sheet open
  const nv = window.innerHeight;
  // update constants (so snapping still sensible)
  // Note: using local recalculation so behavior consistent after resize
  // we simply keep current state
  if(sheet.classList.contains('open')) setSheetTranslate(openY);
  else if(sheet.classList.contains('half')) setSheetTranslate(halfY);
  else setSheetTranslate(collapsedY);
});

// accessibility
sheetHandle.setAttribute('tabindex','0');
sheetHandle.addEventListener('keydown', (e)=> {
  if(e.key === ' ' || e.key === 'Enter') { sheetHandle.click(); e.preventDefault(); }
});

clocksListEl.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowDown') { clocksListEl.scrollBy({top:120,behavior:'smooth'}); e.preventDefault(); }
  if(e.key === 'ArrowUp') { clocksListEl.scrollBy({top:-120,behavior:'smooth'}); e.preventDefault(); }
});
