/* app.js (MVP v3) – Local-only demo for BookWithMe
   - Persist shops in localStorage
   - Register on business.html, show on Leaflet map (index.html)
   - Redirect to index.html after adding a shop (ensures reload on GitHub Pages)
   - Defensive code + small debug messages
*/
(function(){
  'use strict';

  const STORE_KEY = 'bwmShops';

  // ---- Utilities ----
  function loadShops(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e){ console.warn('Could not parse localStorage', e); return []; }
  }
  function saveShops(list){ localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  function addShop(shop){ const list = loadShops(); list.push(shop); saveShops(list); return shop; }
  function getShopById(id){ return loadShops().find(s => s.id === id); }
  function uid(){ return 's_' + Math.random().toString(36).slice(2,10); }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function escapeHtml(str){ return (str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Pseudo-geocoder: any string -> coords near a German center + small deterministic jitter
  const DE_CENTER = [51.1657, 10.4515];
  function stableHash(s){
    s = String(s||''); let h = 2166136261;
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); }
    return h >>> 0;
  }
  const CITY_CENTERS = {
    'berlin':[52.5200,13.4050], 'hamburg':[53.5511,9.9937], 'muenchen':[48.1351,11.5820], 'münchen':[48.1351,11.5820],
    'munich':[48.1351,11.5820], 'koeln':[50.9375,6.9603], 'köln':[50.9375,6.9603], 'cologne':[50.9375,6.9603],
    'frankfurt':[50.1109,8.6821], 'stuttgart':[48.7758,9.1829], 'duesseldorf':[51.2277,6.7735], 'düsseldorf':[51.2277,6.7735],
    'leipzig':[51.3397,12.3731], 'bremen':[53.0793,8.8017], 'dresden':[51.0504,13.7373], 'berlin ':'[52.52,13.405]'
  };
  function geocodeLoose(city, salt=''){
    const key = String(city||'').trim().toLowerCase()
      .replaceAll('ä','ae').replaceAll('ö','oe').replaceAll('ü','ue').replaceAll('ß','ss');
    const base = CITY_CENTERS[key] || DE_CENTER;
    const h = stableHash(key + '|' + salt);
    // jitter ~ +/- 0.01 deg (~1.1 km)
    const jLat = ((h % 2001) - 1000) / 100000;
    const jLng = (((Math.floor(h/2001)) % 2001) - 1000) / 100000;
    return [ clamp(base[0]+jLat, 47.2, 55.2), clamp(base[1]+jLng, 5.5, 15.5) ];
  }

  function setYear(){ const el = document.getElementById('year'); if(el) el.textContent = new Date().getFullYear(); }

  // ---- Page routers ----
  document.addEventListener('DOMContentLoaded', () => {
    setYear();
    wireAuthModal();

    if (document.getElementById('map')) initIndexPage();
    if (document.getElementById('bizForm')) initBusinessPage();
    if (document.getElementById('shopHero')) initShopPage();
  });

  // ---- Auth (demo only) ----
  function wireAuthModal(){
    const btn = document.getElementById('authBtn');
    const modal = document.getElementById('authModal');
    const submit = document.getElementById('authSubmit');
    if(btn && modal){
      btn.addEventListener('click', () => modal.showModal());
      submit && submit.addEventListener('click', () => { modal.close(); alert('Demo-Login (ohne Funktion)'); });
    }
  }

  // ---- INDEX: map + search ----
  function initIndexPage(){
    if (typeof L === 'undefined') { console.error('Leaflet L not found'); return; }

    const map = L.map('map').setView([51.1657, 10.4515], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

    const markers = [];
    function clearMarkers(){ markers.forEach(m => map.removeLayer(m)); markers.length = 0; }

    function renderMarkers(shops){
      clearMarkers();
      const bounds = [];
      shops.forEach(s => {
        if (typeof s.lat === 'number' && typeof s.lng === 'number'){
          const m = L.marker([s.lat, s.lng]).addTo(map);
          m.bindPopup(`<strong>${escapeHtml(s.name)}</strong><br/>${escapeHtml(s.city)}${s.address? ', '+escapeHtml(s.address):''}<br/><a href="shop.html?id=${encodeURIComponent(s.id)}">Öffnen</a>`);
          markers.push(m); bounds.push([s.lat, s.lng]);
        }
      });
      if (bounds.length) map.fitBounds(bounds, {padding:[30,30]});
    }

    function refresh(){
      const list = loadShops();
      renderMarkers(list);
      // Tiny debug badge
      let badge = document.getElementById('bwmCount');
      if(!badge){
        badge = document.createElement('div');
        badge.id='bwmCount';
        badge.style.cssText='position:fixed;bottom:12px;right:12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font:12px/1.2 Inter,system-ui,sans-serif;color:#111;box-shadow:0 6px 24px rgba(0,0,0,.06)';
        document.body.appendChild(badge);
      }
      badge.textContent = `Shops gespeichert: ${list.length}`;
    }

    // initial
    refresh();

    // live update if business.html saved while index open
    window.addEventListener('storage', (e) => {
      if (e.key === STORE_KEY) refresh();
    });

    // search
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsList = document.getElementById('searchResults');

    function filterShops(q){
      q = (q||'').toLowerCase().trim();
      const all = loadShops();
      if(!q) return all;
      return all.filter(s => {
        const offersText = (s.offers||[]).map(o=>`${o.name} ${o.price||''}`).join(' ').toLowerCase();
        return (s.name||'').toLowerCase().includes(q) || (s.city||'').toLowerCase().includes(q) || offersText.includes(q);
      });
    }
    function showResults(items){
      if(!resultsList) return;
      resultsList.innerHTML='';
      if(!items.length){ resultsList.classList.remove('show'); return; }
      items.slice(0,8).forEach(s=>{
        const li = document.createElement('li');
        li.textContent = `${s.name} — ${s.city}`;
        li.addEventListener('click', ()=> location.href = `shop.html?id=${encodeURIComponent(s.id)}`);
        resultsList.appendChild(li);
      });
      resultsList.classList.add('show');
    }

    searchForm && searchForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const q = searchInput.value;
      renderMarkers(filterShops(q));
      showResults(filterShops(q));
    });
    searchInput && searchInput.addEventListener('input', ()=> showResults(filterShops(searchInput.value)));

    // If redirected after add: show a quick toast
    if (location.hash === '#added'){
      setTimeout(()=>{
        alert('Unternehmen gespeichert. Karte aktualisiert.');
        history.replaceState(null, '', location.pathname);
      }, 200);
    }
  }

  // ---- BUSINESS: register ----
  function initBusinessPage(){
    const form = document.getElementById('bizForm');
    const feedback = document.getElementById('bizFeedback');
    const offersWrap = document.getElementById('offers');
    const addOfferBtn = document.getElementById('addOfferBtn');
    const offerName = document.getElementById('offerName');
    const offerPrice = document.getElementById('offerPrice');
    if(!form) return;

    const tempOffers = [];
    function renderOffers(){
      if(!offersWrap) return;
      offersWrap.innerHTML = '';
      tempOffers.forEach((o,idx)=>{
        const div = document.createElement('div');
        div.className = 'offer-card';
        div.innerHTML = `<strong>${escapeHtml(o.name)}</strong><br/><span class="muted">${escapeHtml(o.price||'')}</span>
        <div style="text-align:right;margin-top:6px"><button type="button" class="btn small ghost" data-idx="${idx}">Entfernen</button></div>`;
        div.querySelector('button').addEventListener('click', (e)=>{ const i = Number(e.currentTarget.getAttribute('data-idx')); tempOffers.splice(i,1); renderOffers(); });
        offersWrap.appendChild(div);
      });
    }
    addOfferBtn && addOfferBtn.addEventListener('click', ()=>{
      const n = (offerName.value||'').trim();
      const p = (offerPrice.value||'').trim();
      if(!n){ offerName.focus(); return; }
      tempOffers.push({name:n, price:p});
      offerName.value=''; offerPrice.value=''; renderOffers();
    });

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('bizName').value.trim();
      const city = document.getElementById('bizCity').value.trim();
      const email = document.getElementById('bizEmail').value.trim();
      const address = document.getElementById('bizAddress').value.trim();
      if(!name || !city || !email){
        return showMsg('Bitte fülle Firmenname, Stadt und E-Mail aus.', true);
      }
      const [lat,lng] = geocodeLoose(city, name);
      const shop = { id: uid(), name, city, email, address, lat, lng, offers: tempOffers.slice(), createdAt: Date.now() };
      addShop(shop);
      showMsg('Unternehmen erstellt! Weiter zur Karte …', false);
      // Redirect ensures map reload on GitHub Pages and avoids cache issues
      setTimeout(()=> location.href = 'index.html#added', 500);
    });

    function showMsg(txt, isError){
      if(!feedback){ alert(txt); return; }
      feedback.textContent = txt;
      feedback.style.color = isError ? '#b91c1c' : '#111';
    }
  }

  // ---- SHOP: detail ----
  function initShopPage(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const nameEl = document.getElementById('shopName');
    const metaEl = document.getElementById('shopMeta');
    const tileAI = document.getElementById('aiTile');
    const miniModal = document.getElementById('miniModal');
    const miniTitle = document.getElementById('miniTitle');
    const miniBody = document.getElementById('miniBody');

    const shop = id ? getShopById(id) : null;
    if(!shop){
      if(nameEl) nameEl.textContent = 'Shop nicht gefunden';
      if(metaEl) metaEl.textContent = 'Link ungültig oder Shop gelöscht.';
      return;
    }

    if(nameEl) nameEl.textContent = shop.name;
    if(metaEl) metaEl.textContent = `${shop.city}${shop.address ? ' · '+shop.address : ''}`;

    const bookTile = document.getElementById('bookTile');
    const invoiceTile = document.getElementById('invoiceTile');
    bookTile && bookTile.addEventListener('click', (e)=>{ e.preventDefault(); openMini('Termin buchen', demoBooking(shop)); });
    invoiceTile && invoiceTile.addEventListener('click', (e)=>{ e.preventDefault(); openMini('Rechnungen', '<p>Demo: Rechnungsübersicht folgt.</p>'); });
    tileAI && tileAI.addEventListener('click', ()=> openMini('KI Hilfe', '<p>Demo: Vorschlag basierend auf Angeboten.</p>'));

    function openMini(title, bodyHtml){
      if(!miniModal){ alert('Demo geöffnet.'); return; }
      miniTitle.textContent = title;
      miniBody.innerHTML = bodyHtml;
      miniModal.showModal();
    }
    function demoBooking(s){
      const offers = (s.offers && s.offers.length) ? s.offers : [{name:'Haarschnitt', price:'25 €'}];
      const list = offers.map(o=>`<li>${escapeHtml(o.name)} ${o.price ? '– '+escapeHtml(o.price):''}</li>`).join('');
      return `<p>Wähle einen Service (Demo):</p><ul>${list}</ul><p class="muted">Im MVP bestätigst du den Termin manuell.</p>`;
    }
  }
})();