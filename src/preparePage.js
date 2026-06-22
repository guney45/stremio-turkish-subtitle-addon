'use strict'

// "Hazırlık listesi" sayfası: başlıkla ara, film/dizi/sezon ekle, durumları izle.
// İstemci JS bilinçli olarak backtick ve ${} kullanmaz (sunucu template'iyle çakışmasın).

function preparePage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Hazırlık Listesi · Türkçe Altyazı</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#0e0f13; color:#e6e6e6; margin:0; }
  .wrap { max-width:820px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:1.5rem; margin:0 0 4px; }
  a { color:#9ad1ff; }
  .muted { color:#8d94a3; }
  .err { color:#ef9a9a; font-size:.85rem; margin:-6px 0 8px 4px; }
  .card { background:#171922; border:1px solid #262a36; border-radius:12px; padding:14px 16px; margin:14px 0; }
  .row { display:flex; gap:14px; align-items:center; }
  .grow { flex:1; min-width:0; }
  .poster { width:46px; height:68px; object-fit:cover; border-radius:6px; background:#0b0c10; flex:none; }
  input,select { background:#0b0c10; color:#e6e6e6; border:1px solid #2b2f3c; border-radius:8px; padding:9px 10px; font-size:.95rem; }
  .btn { background:#6f4cff; color:#fff; border:0; border-radius:8px; padding:9px 14px; font-weight:600; cursor:pointer; font-size:.9rem; }
  .btn.alt { background:#2b2f3c; }
  .controls { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  .jobrow { display:flex; gap:10px; align-items:center; padding:9px 0; border-bottom:1px solid #21242f; }
  .badge { color:#0b0c10; font-weight:700; font-size:.78rem; padding:3px 9px; border-radius:20px; white-space:nowrap; }
  .bar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:10px 0 0; }
  .sec { margin-top:26px; }
</style>
</head>
<body>
<div class="wrap">
  <p><a href="/">&larr; Ana sayfa</a></p>
  <h1>🗂️ Hazırlık Listesi</h1>
  <p class="muted">İzleyeceğin film/dizileri önceden ekle. Eklediğin an İngilizce altyazı indirilir, Türkçeye çevrilir ve diske kaydedilir; akşam izlerken anında hazır olur (altyazıda "hazır ✓").</p>

  <div class="sec">
    <div class="bar">
      <input id="q" placeholder="Film veya dizi adı ara…" style="flex:1; min-width:220px"/>
      <button class="btn" id="searchBtn">Ara</button>
    </div>
    <div id="results"></div>
  </div>

  <div class="sec card">
    <b>Elle ekle (IMDb id ile)</b>
    <div class="bar">
      <select id="mType"><option value="movie">Film</option><option value="series">Dizi</option></select>
      <input id="mId" placeholder="tt0944947" style="width:140px"/>
      <input id="mSeason" type="number" min="1" placeholder="Sezon" style="width:80px"/>
      <input id="mEpisode" type="number" min="1" placeholder="Bölüm" style="width:80px"/>
      <button class="btn" id="mAddBtn">Ekle</button>
    </div>
    <p class="muted" style="font-size:.85rem">Dizi için sezon+bölüm girin. (Tüm sezon/dizi için yukarıdaki aramayı kullanın.)</p>
  </div>

  <div class="sec">
    <div class="bar">
      <b style="flex:1">Kuyruk</b>
      <button class="btn alt" id="retryBtn">Hataları tekrar dene</button>
      <button class="btn alt" id="clearBtn">Bitenleri temizle</button>
    </div>
    <div id="jobs" class="card"></div>
  </div>
</div>
<script>
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
function api(p){ return fetch(p).then(function(r){return r.json();}); }
function postJSON(p,b){ return fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(function(r){return r.json();}); }

function doSearch(){
  var q=document.getElementById('q').value.trim(); if(!q) return;
  var box=document.getElementById('results'); box.innerHTML='<p class="muted">Aranıyor…</p>';
  api('/api/search?q='+encodeURIComponent(q)).then(function(list){
    if(!list||!list.length){ box.innerHTML='<p class="muted">Sonuç yok.</p>'; return; }
    box.innerHTML=''; list.forEach(function(it){ box.appendChild(card(it)); });
  }).catch(function(e){ box.innerHTML='<p class="muted">Hata: '+esc(e.message)+'</p>'; });
}

function card(item){
  var div=document.createElement('div'); div.className='card row';
  var poster=item.poster?'<img class="poster" src="'+esc(item.poster)+'"/>':'<div class="poster"></div>';
  var info='<div class="grow"><b>'+esc(item.name)+'</b> <span class="muted">'+esc(item.year)+' · '+(item.type==='series'?'Dizi':'Film')+'</span><div class="muted" style="font-size:.8rem">'+esc(item.id)+'</div></div>';
  var controls;
  if(item.type==='series'){
    controls='<div class="controls">'
      +'<input type="number" min="1" placeholder="Sezon" class="sNum" style="width:64px"/>'
      +'<input type="number" min="1" placeholder="Bölüm" class="eNum" style="width:64px"/>'
      +'<button class="btn epBtn">Bölüm</button>'
      +'<button class="btn alt snBtn">Sezon</button>'
      +'<button class="btn alt allBtn">Tüm dizi</button></div>';
  } else {
    controls='<div class="controls"><button class="btn movieBtn">Hazırla</button></div>';
  }
  div.innerHTML=poster+info+controls;
  if(item.type==='series'){
    var s=div.querySelector('.sNum'), e=div.querySelector('.eNum');
    div.querySelector('.epBtn').onclick=function(){ add({type:'series',imdbId:item.id,title:item.name,season:s.value,episode:e.value}); };
    div.querySelector('.snBtn').onclick=function(){ if(!s.value){alert('Sezon girin');return;} add({type:'series',imdbId:item.id,title:item.name,mode:'season',season:s.value}); };
    div.querySelector('.allBtn').onclick=function(){ if(confirm('Tüm bölümler kuyruğa eklenecek; bu çok sayıda OpenSubtitles indirmesi yapar (günlük kota!). Devam?')) add({type:'series',imdbId:item.id,title:item.name,mode:'series'}); };
  } else {
    div.querySelector('.movieBtn').onclick=function(){ add({type:'movie',imdbId:item.id,title:item.name}); };
  }
  return div;
}

function add(body){ postJSON('/api/prepare',body).then(function(r){ if(r.error){alert('Hata: '+r.error);return;} refreshJobs(); }).catch(function(e){alert('Hata: '+e.message);}); }

function manualAdd(){
  var imdbId=document.getElementById('mId').value.trim(); if(!imdbId){alert('IMDb id girin');return;}
  var type=document.getElementById('mType').value;
  var body={type:type,imdbId:imdbId};
  if(type==='series'){ body.season=document.getElementById('mSeason').value; body.episode=document.getElementById('mEpisode').value; }
  add(body);
}

var STATUS={queued:['Sırada','#a8b0bd'],working:['Çevriliyor…','#f0b429'],done:['Hazır ✓','#46c46a'],error:['Hata','#ef5350']};
function refreshJobs(){
  api('/api/jobs').then(function(list){
    var box=document.getElementById('jobs');
    if(!list||!list.length){ box.innerHTML='<p class="muted">Henüz iş yok.</p>'; return; }
    var html=''; list.forEach(function(j){
      var st=STATUS[j.status]||[j.status,'#999'];
      html+='<div class="jobrow"><span class="grow">'+esc(j.label||j.imdbId)+'</span><span class="badge" style="background:'+st[1]+'">'+st[0]+'</span></div>';
      if(j.status==='error'&&j.error){ html+='<div class="err">'+esc(j.error)+'</div>'; }
    });
    box.innerHTML=html;
  });
}

document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('searchBtn').onclick=doSearch;
  document.getElementById('q').addEventListener('keydown',function(e){ if(e.key==='Enter') doSearch(); });
  document.getElementById('mAddBtn').onclick=manualAdd;
  document.getElementById('clearBtn').onclick=function(){ postJSON('/api/jobs/clear').then(refreshJobs); };
  document.getElementById('retryBtn').onclick=function(){ postJSON('/api/jobs/retry').then(refreshJobs); };
  refreshJobs(); setInterval(refreshJobs,3000);
});
</script>
</body>
</html>`
}

module.exports = preparePage
