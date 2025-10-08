/* BookWithMe – MVP v5 (localStorage)
   - Add, show, and delete shops.
*/
(function(){
  'use strict';
  const STORE_KEY = 'bwmShops';

  // Utility functions
  function $(id){ return document.getElementById(id); }
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); }catch(e){ return []; } }
  function save(list){ localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  function add(shop){ const list=load(); list.push(shop); save(list); ping(); return shop; }
  function byId(id){ return load().find(s=>s.id===id); }
  function removeById(id){ const list=load().filter(s=>s.id!==id); save(list); ping(); }
  function uid(){ return 's_'+Math.random().toString(36).slice(2,10); }
  function escapeHtml(s){ return (s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function ping(){ try{ localStorage.setItem('bwmPing',Date.now().toString()); }catch{} }

  // pseudo geocoder
  const DE_CENTER=[51.1657,10.4515];
  const CITY={'berlin':[52.52,13.405],'hamburg':[53.55,9.99],'muenchen':[48.135,11.582],'munich':[48.135,11.582],'koeln':[50.937,6.96],'cologne':[50.937,6.96],'frankfurt':[50.11,8.682],'stuttgart':[48.775,9.182]};
  function h32(s){s=String(s||'');let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return h>>>0;}
  function geocode(city,salt=''){const k=String(city||'').trim().toLowerCase();const base=CITY[k]||DE_CENTER;const j=h32(k+'|'+salt);return[base[0]+(((j%2001)-1000)/100000),base[1]+((((j/2001|0)%2001)-1000)/100000)];}

  document.addEventListener('DOMContentLoaded',()=>{setYear();wireAuth();seed();route();});

  function setYear(){const y=$('year');if(y)y.textContent=new Date().getFullYear();}
  function wireAuth(){const b=$('authBtn'),m=$('authModal'),s=$('authSubmit');if(b&&m){b.addEventListener('click',()=>m.showModal());}if(s&&m){s.addEventListener('click',()=>{m.close();alert('Demo-Login (MVP)');});}}
  function route(){if($('map'))indexPage();if($('bizForm'))businessPage();if($('shopHero'))shopPage();}
  function seed(){const list=load();if(list.length)return;const[lat,lng]=geocode('Berlin','Demo');save([{id:uid(),name:'Demo Salon',city:'Berlin',email:'demo@salon.de',address:'Alexanderplatz 1',lat,lng,offers:[{name:'Haarschnitt',price:'25 €'}],createdAt:Date.now()}]);}

  // Index Page
  function indexPage(){
    if(typeof L==='undefined'){console.error('Leaflet missing');return;}
    const map=L.map('map').setView([51.1657,10.4515],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
    const markers=[];
    function render(list){
      markers.forEach(m=>map.removeLayer(m));markers.length=0;
      const bounds=[];
      list.forEach(s=>{
        if(typeof s.lat==='number'){const m=L.marker([s.lat,s.lng]).addTo(map);
          const delBtn=`<button style='margin-top:4px;padding:4px 8px;font-size:11px;border:1px solid #ccc;border-radius:6px;cursor:pointer' onclick='localStorage.setItem("bwmDelete","${s.id}")'>Löschen</button>`;
          m.bindPopup(`<strong>${escapeHtml(s.name)}</strong><br>${escapeHtml(s.city)}<br><a href="shop.html?id=${encodeURIComponent(s.id)}">Öffnen</a><br>${delBtn}`);
          markers.push(m);bounds.push([s.lat,s.lng]);}
      });
      if(bounds.length)map.fitBounds(bounds,{padding:[30,30]});
      showCount(list.length);
    }
    render(load());
    window.addEventListener('storage',e=>{
      if(e.key===STORE_KEY||e.key==='bwmPing'||e.key==='bwmDelete'){if(e.key==='bwmDelete'&&e.newValue){removeById(e.newValue);localStorage.removeItem('bwmDelete');}render(load());}
    });
  }

  // Business Page
  function businessPage(){
    const form=$('bizForm'),fb=$('bizFeedback'),offersWrap=$('offers'),addBtn=$('addOfferBtn'),oName=$('offerName'),oPrice=$('offerPrice');const temp=[];
    function renderOffers(){offersWrap.innerHTML='';temp.forEach((o,i)=>{const d=document.createElement('div');d.className='offer-card';d.innerHTML=`<strong>${o.name}</strong><br><span class='muted'>${o.price||''}</span>`;offersWrap.appendChild(d);});}
    addBtn&&addBtn.addEventListener('click',()=>{const n=oName.value.trim(),p=oPrice.value.trim();if(!n)return;oName.value='';oPrice.value='';temp.push({name:n,price:p});renderOffers();});
    form.addEventListener('submit',e=>{e.preventDefault();const name=$('bizName').value.trim(),city=$('bizCity').value.trim(),email=$('bizEmail').value.trim();if(!name||!city||!email)return alert('Bitte Pflichtfelder ausfüllen');const[lat,lng]=geocode(city,name);add({id:uid(),name,city,email,lat,lng,offers:temp.slice(),createdAt:Date.now()});alert('Unternehmen erstellt');location.href='index.html#added';});
  }

  // Shop Page
  function shopPage(){
    const id=new URLSearchParams(location.search).get('id');const s=byId(id);const nameEl=$('shopName'),metaEl=$('shopMeta');if(!s){nameEl.textContent='Shop nicht gefunden';return;}nameEl.textContent=s.name;metaEl.textContent=s.city;
    const hero=$('shopHero');const del=document.createElement('button');del.textContent='🗑️ Laden löschen';del.className='btn ghost';del.style.marginTop='10px';del.addEventListener('click',()=>{if(confirm('Wirklich löschen?')){removeById(id);alert('Laden gelöscht');location.href='index.html';}});hero.appendChild(del);
  }

  function showCount(n){let el=document.getElementById('bwmCount');if(!el){el=document.createElement('div');el.id='bwmCount';el.style.cssText='position:fixed;bottom:12px;right:12px;background:#fff;border:1px solid #ccc;border-radius:8px;padding:6px 10px;font:12px sans-serif';document.body.appendChild(el);}el.textContent='Shops gespeichert: '+n;}
})();