// app.js — World clocks + draggable bottom sheet

// --- Zones to show by default (label, IANA zone or offset) ---
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

// DOM refs
const localClockEl = document.querySelector('#localClock');
const clocksListEl = document.querySelector('#clocksList');
const tzSearchEl = document.querySelector('#tzSearch');
const presetSelect = document.querySelector('#presetTz');
const addBtn = document.querySelector('#addTz');
const btnTop = document.querySelector('#btnTop');

// bottom sheet refs
const sheet = document.getElementById('sheet');
const sheetHandle = document.getElementById('sheetHandle');

// load presets into select
(function populateSelect(){
  PRESET_ZONES.forEach(([label, id])=>{
    const o = document.createElement('option');
    o.value = id; o.textContent = `${label} — ${id}`;
    presetSelect.appendChild(o);
  });
})();

// helper: build clock card element
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

// state: list of cards
const cards = [];

// initial load
function addPresetCards(){
  PRESET_ZONES.forEach(([label,id])=>{
    addClock(label, id);
  });
}
addPresetCards();

// addClock: label can be user text, id must be IANA zone or 'UTC±n' string
function addClock(label, zoneSpec){
  const card = makeClockCard(label, zoneSpec);
  clocksListEl.appendChild(card);
  cards.push(card);
  return card;
}

// update times every second
function updateAll(){
  const now = new Date();
  // local
  localClockEl.querySelector('.time').textContent = now.toLocaleTimeString();
  localClockEl.querySelector('.date').textContent = now.toLocaleDateString();
  // cards
  cards.forEach(c=>{
    const zone = c._zoneId;
    let timeText = '--';
    let meta = '';
    try{
      if(zone.toUpperCase() === 'UTC'){
        timeText = now.toLocaleTimeString('en-GB',{timeZone:'UTC',hour12:false});
        meta = 'UTC';
      } else {
        // use Intl to format in zone if supported
        timeText = new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: false }).format(now);
        // meta: offset and date
        const parts = new Intl.DateTimeFormat(undefined, { timeZone: zone, timeZoneName: 'short' }).formatToParts(now);
        const tzName = parts.find(p=>p.type==='timeZoneName')?.value || '';
        meta = tzName;
      }
    }catch(e){
      timeText = '—';
      meta = 'Invalid zone';
    }
    c.querySelector('.time').textContent = timeText;
    c.querySelector('.meta').textContent = meta;
  });
}
updateAll();
setInterval(updateAll, 1000);

// add button handler (from select or search)
addBtn.addEventListener('click', ()=>{
  const search = tzSearchEl.value.trim();
  const pick = presetSelect.value;
  if(search){
    // try accept either IANA id like "Asia/Tokyo" or "UTC+7" or city name
    // If user typed a known IANA zone present in presets, use it
    addClock(search, search);
    tzSearchEl.value = '';
  } else if(pick){
    // find friendly label
    const lab = (PRESET_ZONES.find(p=>p[1]===pick)||[pick])[0];
    addClock(lab, pick);
    presetSelect.value = '';
  }
});

// scroll to top when pressing 'Top'
btnTop.addEventListener('click', ()=> window.scrollTo({top:0,behavior:'smooth'}));

// keyboard Enter on search
tzSearchEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addBtn.click(); });

// --- Bottom sheet drag behavior ---
let startY = 0;
let currentY = 0;
let dragging = false;
const vh = window.innerHeight;
const collapsedY = vh * 0.56; // same as CSS collapsed translate
const halfY = vh * 0.28;
const openY = vh * 0.06;

function setSheetTranslate(y){
  // clamp
  y = Math.max(openY, Math.min(collapsedY, y));
  const t = y / vh;
  sheet.style.transform = `translateY(${y}px)`;
  currentY = y;
}

// initialize translate inline to match CSS
setSheetTranslate(collapsedY);

// pointer handlers
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
  // snap to nearest
  const mid1 = (collapsedY + halfY) / 2;
  const mid2 = (halfY + openY) / 2;
  if(currentY > mid1) { sheet.classList.add('collapsed'); sheet.classList.remove('half','open'); setSheetTranslate(collapsedY); }
  else if(currentY > mid2) { sheet.classList.add('half'); sheet.classList.remove('collapsed','open'); setSheetTranslate(halfY); }
  else { sheet.classList.add('open'); sheet.classList.remove('collapsed','half'); setSheetTranslate(openY); }
}

// attach events to handle bar
sheetHandle.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);

// touch
sheetHandle.addEventListener('touchstart', startDrag, {passive:false});
window.addEventListener('touchmove', moveDrag, {passive:false});
window.addEventListener('touchend', endDrag);

// also allow tapping handle to toggle states
sheetHandle.addEventListener('click', (e)=>{
  if(dragging) return; // ignore click that is part of drag
  if(sheet.classList.contains('collapsed')){ sheet.classList.remove('collapsed'); sheet.classList.add('half'); setSheetTranslate(halfY); }
  else if(sheet.classList.contains('half')){ sheet.classList.remove('half'); sheet.classList.add('open'); setSheetTranslate(openY); }
  else { sheet.classList.remove('open'); sheet.classList.add('collapsed'); setSheetTranslate(collapsedY); }
});

// ensure sheet translates correctly when resizing viewport
window.addEventListener('resize', ()=> {
  const vh2 = window.innerHeight;
  setSheetTranslate(Math.max(openY, Math.min(collapsedY, currentY)));
});

// small accessibility: keyboard to open sheet (Space on handle)
sheetHandle.setAttribute('tabindex','0');
sheetHandle.addEventListener('keydown', (e)=> {
  if(e.key === ' ' || e.key === 'Enter') { sheetHandle.click(); e.preventDefault(); }
});

// initial state classes
sheet.classList.add('collapsed');

// Update local clock label/time
function updateLocalClock(){
  const now = new Date();
  localClockEl.querySelector('.time').textContent = now.toLocaleTimeString();
  localClockEl.querySelector('.date').textContent = now.toLocaleDateString();
}
updateLocalClock();
setInterval(updateLocalClock, 1000);

// Accessibility: allow arrow keys in clocks list
clocksListEl.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowDown') { clocksListEl.scrollBy({top:120,behavior:'smooth'}); e.preventDefault(); }
  if(e.key === 'ArrowUp') { clocksListEl.scrollBy({top:-120,behavior:'smooth'}); e.preventDefault(); }
});
