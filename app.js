// Minimal data + behavior for map, search, AI, and shop page
const SHOPS = [
  {id:'s1', name:'Salon Glückssträhne', city:'Berlin', services:['haarschnitt','farbe','pflege'], lat:52.520008, lng:13.404954},
  {id:'s2', name:'Cut & Coffee', city:'Hamburg', services:['haarschnitt','bart'], lat:53.551086, lng:9.993682},
  {id:'s3', name:'Barber König', city:'München', services:['bart','haarschnitt'], lat:48.137154, lng:11.576124},
  {id:'s4', name:'Color Studio', city:'Köln', services:['farbe','pflege'], lat:50.937531, lng:6.960279},
  {id:'s5', name:'Style Atelier', city:'Frankfurt', services:['haarschnitt','farbe','pflege'], lat:50.110924, lng:8.682127},
];

const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));
const byId = id => SHOPS.find(s => s.id === id);

function initCommon(){
  const yEl = $('#year'); if(yEl) yEl.textContent = new Date().getFullYear();

  const authBtn = $('#authBtn');
  const authModal = $('#authModal');
  if(authBtn && authModal){
    authBtn.addEventListener('click', () => authModal.showModal());
    authModal.addEventListener('close', () => {
      if(authModal.returnValue !== 'cancel'){
        const mail = $('#authEmail', authModal).value.trim();
        const name = $('#authName', authModal).value.trim();
        if(mail) localStorage.setItem('bwm_user', JSON.stringify({mail, name}));
      }
    });
  }
}

function initHome(){
  const mapEl = $('#map');
  if(!mapEl) return;

  // Init Leaflet map
  const map = L.map('map', { zoomControl: true }).setView([51.163361, 10.447683], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const markers = new Map();
  SHOPS.forEach(shop => {
    const m = L.marker([shop.lat, shop.lng]).addTo(map).bindPopup(`<strong>${shop.name}</strong><br>${shop.city}`);
    m.on('click', () => {
      window.location.href = `shop.html?id=${shop.id}`;
    });
    markers.set(shop.id, m);
  });

  // Search
  const form = $('#searchForm');
  const input = $('#searchInput');
  const results = $('#searchResults');

  function match(q){
    q = q.toLowerCase().trim();
    if(!q) return [];
    return SHOPS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.services.some(v => v.includes(q))
    ).slice(0,6);
  }

  function renderResults(list){
    results.innerHTML = '';
    if(!list.length){ results.classList.remove('show'); return; }
    list.forEach(s => {
      const li = document.createElement('li');
      li.setAttribute('role','option');
      li.innerHTML = `<strong>${s.name}</strong> <span class="muted">• ${s.city}</span>`;
      li.addEventListener('click', () => {
        map.setView([s.lat, s.lng], 13);
        markers.get(s.id).openPopup();
        setTimeout(()=> window.location.href = `shop.html?id=${s.id}`, 600);
      });
      results.appendChild(li);
    });
    results.classList.add('show');
  }

  input.addEventListener('input', () => renderResults(match(input.value)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const list = match(input.value);
    if(list.length){
      const s = list[0];
      window.location.href = `shop.html?id=${s.id}`;
    }
  });
  document.addEventListener('click', (e) => {
    if(!results.contains(e.target) && e.target !== input) results.classList.remove('show');
  });

  // AI modal
  const aiModal = $('#aiModal');
  const aiOpen = $('#aiOpen');
  const aiAsk = $('#aiAsk');
  const aiInput = $('#aiQuestion');
  const aiMessages = $('#aiMessages');

  aiOpen?.addEventListener('click', () => { aiModal.showModal(); aiInput.focus(); });

  function aiReply(text){ const div = document.createElement('div'); div.className='ai-msg'; div.innerHTML = text; aiMessages.appendChild(div); }

  function handleAI(){
    const q = aiInput.value.trim();
    if(!q) return;
    aiReply(`<strong>Du:</strong> ${q}`);

    // Heuristic: infer desired service & city keywords
    const qw = q.toLowerCase();
    const need = (()=>{
      if(qw.includes('bart')) return 'bart';
      if(qw.includes('farbe') || qw.includes('color') || qw.includes('strähn')) return 'farbe';
      if(qw.includes('pflege')) return 'pflege';
      return 'haarschnitt';
    })();
    const city = ['berlin','hamburg','münchen','koeln','köln','frankfurt'].find(c => qw.includes(c));

    let cand = SHOPS.filter(s => s.services.includes(need));
    if(city){
      const norm = city.replace('köln','köln').replace('koeln','köln');
      cand = cand.filter(s => s.city.toLowerCase().includes(norm));
    }
    if(!cand.length) cand = SHOPS;

    const list = cand.slice(0,3).map(s => `<li><a href="shop.html?id=${s.id}">${s.name}</a> <span class="muted">• ${s.city}</span></li>`).join('');
    aiReply(`<strong>KI:</strong> Ich empfehle <em>${need}</em>. Passende Shops:<ul>${list}</ul>`);
    aiInput.value='';
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  aiAsk?.addEventListener('click', handleAI);
  aiInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') { e.preventDefault(); handleAI(); }});
}

function initShop(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const shop = byId(id) || SHOPS[0];

  const nameEl = $('#shopName');
  const metaEl = $('#shopMeta');
  if(nameEl) nameEl.textContent = shop.name;
  if(metaEl) metaEl.textContent = `${shop.city} • Services: ${shop.services.join(', ')}`;

  // Demo modals
  const mini = $('#miniModal');
  $('#bookTile')?.addEventListener('click', (e)=>{
    e.preventDefault();
    $('#miniTitle').textContent = 'Termin buchen (Demo)';
    $('#miniBody').innerHTML = `
      <label>Datum</label>
      <input type="date" style="padding:12px;border:1px solid var(--border);border-radius:12px;width:100%">
      <label style="margin-top:10px;display:block">Service</label>
      <select style="padding:12px;border:1px solid var(--border);border-radius:12px;width:100%">
        ${shop.services.map(s=>`<option>${s}</option>`).join('')}
      </select>
      <div style="margin-top:12px;text-align:right"><button class="btn">Weiter</button></div>
    `;
    mini.showModal();
  });
  $('#aiTile')?.addEventListener('click', ()=>{
    $('#miniTitle').textContent = 'KI Hilfe (Demo)';
    $('#miniBody').innerHTML = `<p class="muted">Stell deine Frage – z. B. „Welche Dienstleistung passt zu meiner Haarlänge?“</p>
      <div style="display:flex;gap:10px"><input style="flex:1;padding:12px;border:1px solid var(--border);border-radius:12px" placeholder="Frag die KI…"><button class="btn">Fragen</button></div>`;
    mini.showModal();
  });
  $('#invoiceTile')?.addEventListener('click', (e)=>{
    e.preventDefault();
    $('#miniTitle').textContent = 'Rechnungen';
    const user = JSON.parse(localStorage.getItem('bwm_user')||'{}');
    $('#miniBody').innerHTML = user.mail ? `<p class="muted">Eingeloggt als <strong>${user.mail}</strong>. Hier würden deine Rechnungen erscheinen.</p>` : `<p class="muted">Bitte zuerst einloggen, um Rechnungen zu sehen.</p>`;
    mini.showModal();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCommon();
  initHome();
  initShop();
});
