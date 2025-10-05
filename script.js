function $(q){return document.querySelector(q)}
function fakeAssistant(e){
  e.preventDefault();
  const hair = $('#hair').value;
  const goal = $('#goal').value;
  const budget = $('#budget').value;
  if(!hair || !goal || !budget){return false}
  const mapping = {
    kurz: {auffrischen:'Haarschnitt Classic', verändern:'Fade &amp; Style', farbe:'Tönung Kurz'},
    mittel:{auffrischen:'Haarschnitt Medium', verändern:'Stufen &amp; Style', farbe:'Glossing Medium'},
    lang: {auffrischen:'Spitzen schneiden &amp; Pflege', verändern:'Restyle Lang', farbe:'Balayage'}
  };
  const product = mapping[hair][goal] || 'Haarschnitt';
  const price = budget==='premium' ? 'ab 89€' : budget==='standard' ? 'ab 59€' : 'ab 39€';
  $('#demo-result').innerHTML = `<strong>Vorschlag:</strong> ${product} — <em>${price}</em>. <br>Jetzt freien Slot auswählen und buchen.`;
  return false;
}
function handleContact(e){
  e.preventDefault();
  const name = $('#name').value.trim();
  const email = $('#email').value.trim();
  if(!name || !email){
    $('#contactFeedback').textContent = 'Bitte Name und E-Mail ausfüllen.';
    return false;
  }
  $('#contactFeedback').textContent = 'Danke! Wir melden uns innerhalb von 24 Stunden.';
  e.target.reset();
  return false;
}
document.addEventListener('DOMContentLoaded',()=>{
  const y = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = y;
});
