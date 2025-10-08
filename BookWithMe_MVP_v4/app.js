/* BookWithMe – MVP v4 (localStorage)
   - Register shops on business.html
   - Show markers on index.html (Leaflet)
   - Shop detail on shop.html?id=...
   - No deleting files to add data. Data persists in browser.
*/
(function(){
  'use strict';
  const STORE_KEY = 'bwmShops';
  const VERSION = (window.BWM_VERSION || '4');

  // ---------- Utils ----------
  function $(id){ return document.getElementById(id); }
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); }catch(e){ return []; } }
  function save(list){ localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  function add(shop){ const list = load(); list.push(shop); save(list); notifyMapPages(); return shop; }
  function byId(id){ return load().find(s => s.id === id); }
  function uid(){ return 's_' + Math.random().toString(36).slice(2,10); }
  function escapeHtml(str){ return (str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function notifyMapPages(){ try{ localStorage.setItem('bwmPing', Date.now().toString()); }catch{} }

  // City -> coords (loose match + jitter)
  const DE_CENTER = [51.1657, 10.4515];
  const CITY = {
    'berlin':[52.5200,13.4050],'hamburg':[53.5511,9.9937],'muenchen':[48.1351,11.5820],'münchen':[48.1351,11.5820],
    'munich':[48.1351,11.5820],'koeln':[50.9375,6.9603],'köln':[50.9375,6.9603],'cologne':[50.9375,6.9603],
    'frankfurt':[50.1109,8.6821],'stuttgart':[48.7758,9.1829],'duesseldorf':[51.2277,6.7735],'düsseldorf':[51.2277,6.7735],
    'leipzig':[51.3397,12.3731],'bremen':[53.0793,8.8017],'dresden':[51.0504,13.7373]
  };
  function h32(s){ s=String(s||''); let h=2166136261>>>0; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);} return h>>>0; }
  function geocode(city, salt=''){
    const k = String(city||'').trim().toLowerCase().replaceAll('ä','ae').replaceAll('ö','oe').replaceAll('ü','ue').replaceAll('ß','ss');
    const base = CITY[k] || DE_CENTER;
    const j = h32(k+'|'+salt);
    const lat = base[0] + (((j%2001)-1000)/100000);
    const lng = base[1] + ((((j/2001|0)%2001)-1000)/100000);
    return [lat, lng];
  }

  // ---------- Common ----------
  document.addEventListener('DOMContentLoaded', () => {
    setYear();
    wireAuth();
    seedIfEmpty();
    route();
  });

  function setYear(){ const y=$('year'); if(y) y.textContent = new Date().getFullYear(); }
  function wireAuth(){
    const b=$('authBtn'), m=$('authModal'), s=$('authSubmit');
    if(b && m){ b.addEventListener('click', ()=> m.showModal()); }
    if(s && m){ s.addEventListener('click', ()=> { m.close(); alert('Demo-Login (MVP)'); }); }
  }
  function route(){
    if ($('map')) indexPage();
    if ($('bizForm')) businessPage();
    if ($('shopHero')) shopPage();
  }
  function seedIfEmpty(){
    const list = load();
    if(list.length) return;
    const [lat,lng] = geocode('Berlin','Demo');
    save([{
      id: uid(),
      name:'Demo Salon', city:'Berlin', email:'demo@salon.de', address:'Alexanderplatz 1',
      lat, lng, offers:[{name:'Haarschnitt', price:'25 €'}, {name:'Föhnen', price:'15 €'}],
      createdAt: Date.now()
    }]);
  }

  // ---------- Index (map + search) ----------
  function indexPage(){
    if (typeof L === 'undefined'){ console.error('Leaflet fehlt.'); return; }
    const map = L.map('map').setView([51.1657, 10.4515], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

    const markers = [];
    function clear(){ markers.forEach(m => map.removeLayer(m)); markers.length=0; }
    function render(list){
      clear();
      const bounds = [];
      list.forEach(s=>{
        if(typeof s.lat==='number' && typeof s.lng==='number'){
          const m=L.marker([s.lat,s.lng]).addTo(map);
          m.bindPopup(`<strong>${escapeHtml(s.name)}</strong><br>${escapeHtml(s.city)}${s.address?', '+escapeHtml(s.address):''}<br><a href="shop.html?id=${encodeURIComponent(s.id)}">Öffnen</a>`);
          markers.push(m); bounds.push([s.lat,s.lng]);
        }
      });
      if(bounds.length) map.fitBounds(bounds, {padding:[30,30]});
      showCount(load().length);
    }
    function refresh(){ render(load()); }
    refresh();

    // live update between tabs/pages
    window.addEventListener('storage', (e)=>{
      if (e.key === STORE_KEY || e.key === 'bwmPing') refresh();
    });

    const form=$('searchForm'), input=$('searchInput'), listEl=$('searchResults');
    function filter(q){
      q=(q||'').toLowerCase().trim();
      const all=load(); if(!q) return all;
      return all.filter(s=>{
        const offers=(s.offers||[]).map(o=>(o.name+' '+(o.price||''))).join(' ').toLowerCase();
        return (s.name||'').toLowerCase().includes(q) || (s.city||'').toLowerCase().includes(q) || offers.includes(q);
      });
    }
    function showResults(items){
      if(!listEl) return;
      listEl.innerHTML='';
      if(!items.length){ listEl.classList.remove('show'); return; }
      items.slice(0,8).forEach(s=>{
        const li=document.createElement('li');
        li.textContent=`${s.name} — ${s.city}`;
        li.addEventListener('click', ()=> location.href=`shop.html?id=${encodeURIComponent(s.id)}`);
        listEl.appendChild(li);
      });
      listEl.classList.add('show');
    }
    form && form.addEventListener('submit', (e)=>{ e.preventDefault(); const q=input.value; render(filter(q)); showResults(filter(q)); });
    input && input.addEventListener('input', ()=> showResults(filter(input.value)));

    if (location.hash === '#added'){
      setTimeout(()=>{ alert('Unternehmen gespeichert.'); history.replaceState(null,'',location.pathname); }, 150);
    }
  }

  // ---------- Business (register) ----------
  function businessPage(){
    const form=$('bizForm'), fb=$('bizFeedback'), offersWrap=$('offers'), addBtn=$('addOfferBtn'), oName=$('offerName'), oPrice=$('offerPrice');
    const temp=[];
    function renderOffers(){
      if(!offersWrap) return;
      offersWrap.innerHTML='';
      temp.forEach((o,i)=>{
        const div=document.createElement('div');
        div.className='offer-card';
        div.innerHTML=`<strong>${escapeHtml(o.name)}</strong><br><span class="muted">${escapeHtml(o.price||'')}</span>
          <div style="text-align:right;margin-top:6px"><button type="button" class="btn small ghost" data-i="${i}">Entfernen</button></div>`;
        div.querySelector('button').addEventListener('click', (e)=>{ const idx=Number(e.currentTarget.getAttribute('data-i')); temp.splice(idx,1); renderOffers(); });
        offersWrap.appendChild(div);
      });
    }
    addBtn && addBtn.addEventListener('click', ()=>{
      const n=(oName.value||'').trim(), p=(oPrice.value||'').trim();
      if(!n){ oName.focus(); return; }
      temp.push({name:n, price:p}); oName.value=''; oPrice.value=''; renderOffers();
    });

    form && form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name=$('bizName').value.trim(), city=$('bizCity').value.trim(), email=$('bizEmail').value.trim(), address=($('bizAddress').value||'').trim();
      if(!name || !city || !email){ return msg('Bitte fülle Firmenname, Stadt und E-Mail aus.', true); }
      const [lat,lng]=geocode(city, name);
      add({ id:uid(), name, city, email, address, lat, lng, offers:temp.slice(), createdAt:Date.now() });
      msg('Unternehmen erstellt – zurück zur Karte …', false);
      setTimeout(()=> location.href='index.html#added', 500);
      form.reset(); temp.length=0; renderOffers();
    });

    function msg(t, err){
      if(!fb){ alert(t); return; }
      fb.textContent=t; fb.style.color = err ? '#b91c1c' : '#111';
    }
  }

  // ---------- Shop (detail) ----------
  function shopPage(){
    const p=new URLSearchParams(location.search); const id=p.get('id');
    const s=id ? byId(id) : null;
    const nameEl=$('shopName'), metaEl=$('shopMeta');
    if(!s){ if(nameEl) nameEl.textContent='Shop nicht gefunden'; if(metaEl) metaEl.textContent='Ungültiger Link.'; return; }
    if(nameEl) nameEl.textContent=s.name;
    if(metaEl) metaEl.textContent=`${s.city}${s.address ? ' · '+s.address : ''}`;

    const mini=$('miniModal'), t=$('miniTitle'), b=$('miniBody');
    function openMini(title, html){ if(!mini){ alert('Demo geöffnet.'); return; } t.textContent=title; b.innerHTML=html; mini.showModal(); }
    const book=$('bookTile'), inv=$('invoiceTile'), ai=$('aiTile');
    book && book.addEventListener('click', (e)=>{ e.preventDefault(); openMini('Termin buchen', renderOffers(s)); });
    inv && inv.addEventListener('click', (e)=>{ e.preventDefault(); openMini('Rechnungen', '<p>Demo: Rechnungen folgen.</p>'); });
    ai && ai.addEventListener('click', ()=> openMini('KI Hilfe', '<p>Demo: Vorschlag basierend auf Angeboten.</p>'));

    function renderOffers(shop){
      const list=(shop.offers&&shop.offers.length)?shop.offers:[{name:'Haarschnitt', price:'25 €'}];
      return '<p>Wähle einen Service (Demo):</p><ul>'+list.map(o=>`<li>${escapeHtml(o.name)} ${o.price ? '– '+escapeHtml(o.price): ''}</li>`).join('')+'</ul><p class="muted">Im MVP bestätigst du den Termin manuell.</p>';
    }
  }

  // ---------- Tiny debug badge ----------
  function showCount(n){
    let el=document.getElementById('bwmCount');
    if(!el){
      el=document.createElement('div');
      el.id='bwmCount';
      el.style.cssText='position:fixed;bottom:12px;right:12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font:12px/1.2 Inter,system-ui,sans-serif;color:#111;box-shadow:0 6px 24px rgba(0,0,0,.06)';
      el.title='Anzahl gespeicherter Shops (localStorage)';
      document.body.appendChild(el);
    }
    el.textContent='Shops gespeichert: '+n;
  }
})();