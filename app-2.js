/* app.js – MVP Datenspeicher + Karte + Registrierung + Shop-Ansicht
   Speichert Unternehmen lokal (localStorage) und zeigt sie auf der Karte.
   Seiten: index.html, business.html, shop.html
*/

(function(){
  // ---------- Mini-Store ----------
  const STORE_KEY = 'bwmShops';

  function loadShops(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveShops(list){ localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  function addShop(shop){
    const list = loadShops();
    list.push(shop);
    saveShops(list);
    return shop;
  }
  function getShopById(id){ return loadShops().find(s => s.id === id); }

  // ---------- ID & Hash Utilities ----------
  function uid(){ return 's_' + Math.random().toString(36).slice(2,10); }
  function hash(str){
    let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; }
    return Math.abs(h);
  }

  // ---------- Pseudo-Geocoder (stadt -> lat/lng + leichte Streuung) ----------
  const CITY_CENTERS = {
    'berlin':[52.5200,13.4050], 'hamburg':[53.5511,9.9937], 'münchen':[48.1351,11.5820],
    'munich':[48.1351,11.5820], 'köln':[50.9375,6.9603], 'cologne':[50.9375,6.9603],
    'frankfurt':[50.1109,8.6821], 'stuttgart':[48.7758,9.1829], 'düsseldorf':[51.2277,6.7735],
    'leipzig':[51.3397,12.3731], 'bremen':[53.0793,8.8017], 'dresden':[51.0504,13.7373]
  };
  function geocodeCity(city, salt=''){
    const key = (city||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const base = CITY_CENTERS[key] || [51.1657, 10.4515]; // Deutschland Mitte Fallback
    // deterministische, kleine Streuung um die Stadt (ca. bis ~1.2km)
    const h = hash((city||'')+'|'+salt);
    const jitterLat = ((h % 2000) - 1000) / 100000; // ±0.01°
    const jitterLng = (((Math.floor(h/2000)) % 2000) - 1000) / 100000;
    return [base[0] + jitterLat, base[1] + jitterLng];
  }

  // ---------- i18n: nur Kleinigkeiten ----------
  function setYear(){ const el = document.getElementById('year'); if(el) el.textContent = new Date().getFullYear(); }
  setYear();

  // ---------- Auth-Modal (nur UI-Dummy fürs MVP) ----------
  (function authModal(){
    const btn = document.getElementById('authBtn');
    const modal = document.getElementById('authModal');
    const submit = document.getElementById('authSubmit');
    if(btn && modal){
      btn.addEventListener('click', () => modal.showModal());
      submit && submit.addEventListener('click', () => {
        modal.close(); alert('Demo: Login/Registrierung ist im MVP nur angedeutet.');
      });
    }
  })();

  // ---------- INDEX: Karte + Ergebnisse ----------
  if(document.getElementById('map')){
    // Leaflet Karte initialisieren
    const map = L.map('map').setView([51.1657, 10.4515], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markers = [];
    function clearMarkers(){ markers.forEach(m => map.removeLayer(m)); markers.length = 0; }

    function renderMarkers(shops){
      clearMarkers();
      const bounds = [];
      shops.forEach(s => {
        if(typeof s.lat === 'number' && typeof s.lng === 'number'){
          const m = L.marker([s.lat, s.lng]).addTo(map);
          m.bindPopup(`
            <strong>${escapeHtml(s.name)}</strong><br/>
            ${escapeHtml(s.city)}${s.address? ', ' + escapeHtml(s.address) : ''}<br/>
            <a href="shop.html?id=${encodeURIComponent(s.id)}">Öffnen</a>
          `);
          markers.push(m);
          bounds.push([s.lat, s.lng]);
        }
      });
      if(bounds.length){ map.fitBounds(bounds, {padding:[30,30]}); }
    }

    // initiale Marker
    const all = loadShops();
    renderMarkers(all);

    // Suche
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsList = document.getElementById('searchResults');

    function filterShops(q){
      q = (q||'').toLowerCase().trim();
      if(!q) return all;
      return all.filter(s => {
        const offersText = (s.offers||[]).map(o=>o.name+' '+o.price).join(' ').toLowerCase();
        return (s.name||'').toLowerCase().includes(q)
          || (s.city||'').toLowerCase().includes(q)
          || (offersText.includes(q));
      });
    }

    function showResults(items){
      if(!resultsList) return;
      resultsList.innerHTML = '';
      if(!items.length){ resultsList.classList.remove('show'); return; }
      items.slice(0,8).forEach(s=>{
        const li = document.createElement('li');
        li.textContent = `${s.name} — ${s.city}`;
        li.addEventListener('click', ()=>{
          window.location.href = `shop.html?id=${encodeURIComponent(s.id)}`;
        });
        resultsList.appendChild(li);
      });
      resultsList.classList.add('show');
    }

    searchForm && searchForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const q = searchInput.value;
      const filtered = filterShops(q);
      renderMarkers(filtered);
      showResults(filtered);
    });

    searchInput && searchInput.addEventListener('input', ()=>{
      const q = searchInput.value;
      showResults(filterShops(q));
    });
  }

  // ---------- BUSINESS: Registrierung ----------
  (function businessPage(){
    const form = document.getElementById('bizForm');
    const feedback = document.getElementById('bizFeedback');
    const offersWrap = document.getElementById('offers');
    const addOfferBtn = document.getElementById('addOfferBtn');
    const offerName = document.getElementById('offerName');
    const offerPrice = document.getElementById('offerPrice');

    if(!form) return;

    // Angebot hinzufügen (nur UI, erst beim Submit persistieren)
    const tempOffers = [];
    function renderOffers(){
      if(!offersWrap) return;
      offersWrap.innerHTML = '';
      tempOffers.forEach((o,idx)=>{
        const div = document.createElement('div');
        div.className = 'offer-card';
        div.innerHTML = `
          <strong>${escapeHtml(o.name)}</strong><br/>
          <span class="muted">${escapeHtml(o.price||'')}</span>
          <div style="text-align:right;margin-top:6px">
            <button type="button" class="btn small ghost" data-idx="${idx}">Entfernen</button>
          </div>
        `;
        div.querySelector('button').addEventListener('click', (e)=>{
          const i = Number(e.currentTarget.getAttribute('data-idx'));
          tempOffers.splice(i,1); renderOffers();
        });
        offersWrap.appendChild(div);
      });
    }

    addOfferBtn && addOfferBtn.addEventListener('click', ()=>{
      const n = (offerName.value||'').trim();
      const p = (offerPrice.value||'').trim();
      if(!n){ offerName.focus(); return; }
      tempOffers.push({name:n, price:p});
      offerName.value=''; offerPrice.value='';
      renderOffers();
    });

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('bizName').value.trim();
      const city = document.getElementById('bizCity').value.trim();
      const email = document.getElementById('bizEmail').value.trim();
      const address = document.getElementById('bizAddress').value.trim();

      if(!name || !city || !email){
        notify('Bitte fülle Firmenname, Stadt und E-Mail aus.');
        return;
      }

      // Koordinaten aus Stadt + Namen deterministisch ableiten
      const [lat, lng] = geocodeCity(city, name);

      const shop = {
        id: uid(),
        name, city, email, address,
        lat, lng,
        offers: tempOffers.slice(),
        createdAt: Date.now()
      };

      addShop(shop);

      if(feedback){
        feedback.textContent = 'Unternehmen erstellt! Es erscheint jetzt auf der Karte.';
        feedback.classList.remove('error');
        // Direktlink zum Shop
        const a = document.createElement('a');
        a.href = `shop.html?id=${encodeURIComponent(shop.id)}`;
        a.textContent = 'Zum Shop';
        a.style.marginLeft = '8px';
        feedback.appendChild(a);
      }
      form.reset();
      tempOffers.length = 0; renderOffers();
    });

    function notify(msg){
      if(!feedback) return alert(msg);
      feedback.textContent = msg;
      feedback.classList.add('error');
    }
  })();

  // ---------- SHOP: Detailseite ----------
  (function shopPage(){
    const hero = document.getElementById('shopHero');
    if(!hero) return;

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
      nameEl.textContent = 'Shop nicht gefunden';
      metaEl.textContent = 'Dieser Link ist ungültig oder der Shop wurde gelöscht.';
      return;
    }

    nameEl.textContent = shop.name;
    metaEl.textContent = `${shop.city}${shop.address ? ' · ' + shop.address : ''}`;

    // Kleine Demos für Kacheln
    const bookTile = document.getElementById('bookTile');
    const invoiceTile = document.getElementById('invoiceTile');
    bookTile && bookTile.addEventListener('click', (e)=>{ e.preventDefault(); openMini('Termin buchen', demoBooking(shop)); });
    invoiceTile && invoiceTile.addEventListener('click', (e)=>{ e.preventDefault(); openMini('Rechnungen', '<p>Demo: Rechnungsübersicht kommt im nächsten Schritt.</p>'); });
    tileAI && tileAI.addEventListener('click', ()=> openMini('KI Hilfe', '<p>Demo: KI-Empfehlung schlägt basierend auf Angeboten einen Service vor.</p>'));

    function openMini(title, bodyHtml){
      if(!miniModal) return alert('Demo geöffnet.');
      miniTitle.textContent = title;
      miniBody.innerHTML = bodyHtml;
      miniModal.showModal();
    }

    function demoBooking(s){
      const offers = (s.offers && s.offers.length) ? s.offers : [{name:'Haarschnitt', price:'25 €'}];
      const list = offers.map(o=>`<li>${escapeHtml(o.name)} ${o.price ? '– '+escapeHtml(o.price):''}</li>`).join('');
      return `
        <p>Wähle einen Service (Demo):</p>
        <ul>${list}</ul>
        <p class="muted">Im MVP genügt es, wenn du dem Kunden manuell einen Termin bestätigst.</p>
      `;
    }
  })();

  // ---------- AI-Dummy (Index) ----------
  (function aiIndex(){
    const openBtn = document.getElementById('aiOpen');
    const modal = document.getElementById('aiModal');
    const askBtn = document.getElementById('aiAsk');
    const input = document.getElementById('aiQuestion');
    const messages = document.getElementById('aiMessages');
    if(openBtn && modal){ openBtn.addEventListener('click', ()=> modal.showModal()); }
    if(askBtn && input && messages){
      askBtn.addEventListener('click', ()=>{
        const q = (input.value||'').trim();
        if(!q) return;
        const reply = suggestShop(q);
        const div = document.createElement('div');
        div.className = 'ai-msg';
        div.textContent = reply;
        messages.appendChild(div);
        input.value='';
      });
    }
    function suggestShop(q){
      const ql = q.toLowerCase();
      const inCity = loadShops().filter(s => (s.city||'').toLowerCase() && ql.includes((s.city||'').toLowerCase()));
      const list = inCity.length ? inCity : loadShops();
      if(!list.length) return 'Noch keine Shops gespeichert. Lege zuerst ein Unternehmen an.';
      const s = list[0];
      return `Wie wäre es mit „${s.name}“ in ${s.city}? Öffnen: shop.html?id=${s.id}`;
    }
  })();

  // ---------- Helpers ----------
  function escapeHtml(str){
    return (str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();