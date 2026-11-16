const LOCATIONS = [
  {name:"Рилски манастир",region:"Западна България",lat:42.1333,lng:23.3400,difficulty:1,hint:"Намира се в планина Рила, сред гориста и планинска местност.",fact:"Рилският манастир е основан през X век и е сред най-значимите културни паметници на България.",image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=85",caption:"Сред планините на Рила"},
  {name:"Нос Калиакра",region:"Източна България",lat:43.3667,lng:28.4667,difficulty:1,hint:"Потърси го на северното Черноморие, близо до Каварна.",fact:"Нос Калиакра е дълъг и тесен скалист полуостров, който се врязва около 2 km в Черно море.",image:"https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1000&q=85",caption:"Скалистият бряг на Черно море"},
  {name:"Пловдив – Старият град",region:"Южна България",lat:42.1496,lng:24.7500,difficulty:1,hint:"Градът е разположен в Горнотракийската низина.",fact:"Пловдив е един от най-старите непрекъснато населявани градове в Европа.",image:"https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1000&q=85",caption:"Исторически улици и архитектура"},
  {name:"Белоградчишки скали",region:"Северна България",lat:43.6230,lng:22.6830,difficulty:2,hint:"Намират се в Северозападна България, близо до град Белоградчик.",fact:"Белоградчишките скали са природен феномен от пясъчници и конгломерати с причудливи форми.",image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85",caption:"Величествени скални форми"},
  {name:"Седемте рилски езера",region:"Западна България",lat:42.2030,lng:23.3160,difficulty:2,hint:"Ледникова група от езера във високите части на Рила.",fact:"Седемте рилски езера са разположени стъпаловидно в циркус и всяко има собствено име.",image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85",caption:"Езера високо в Рила"},
  {name:"Велико Търново – Царевец",region:"Северна България",lat:43.0812,lng:25.6555,difficulty:2,hint:"Потърси старопрестолния град по поречието на Янтра.",fact:"Царевец е бил главната крепост на столицата Търновград по време на Второто българско царство.",image:"https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1000&q=85",caption:"Крепост над речните меандри"},
  {name:"Връх Мусала",region:"Западна България",lat:42.1794,lng:23.5850,difficulty:3,hint:"Най-високият връх в България и на Балканския полуостров.",fact:"Връх Мусала е висок 2925,4 m и се намира в Рила планина.",image:"https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=1000&q=85",caption:"Високопланински пейзаж"},
  {name:"Созопол – старият град",region:"Източна България",lat:42.4227,lng:27.6950,difficulty:2,hint:"Намира се на южното българско Черноморие.",fact:"Созопол е сред най-старите градове по българското Черноморие и е основан като гръцка колония Аполония.",image:"https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=85",caption:"Крайбрежен град с история"},
  {name:"Крушунски водопади",region:"Северна България",lat:43.2460,lng:25.0340,difficulty:3,hint:"Потърси ги в Предбалкана, близо до село Крушуна.",fact:"Водопадите са известни с каскадните си прагове и синьо-зелените водни басейни.",image:"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1000&q=85",caption:"Водни каскади сред зеленина"}
];

const DEMO_PLAYERS = [
  {name:"MountainFox",score:4380},{name:"GeoMaster",score:3920},{name:"BalkanExplorer",score:3510},
  {name:"MapHunter",score:3190},{name:"RilaRider",score:2870}
];
const $ = id => document.getElementById(id);
let map=null, guessMarker=null, correctMarker=null, currentLocation=null, gameQueue=[], roundIndex=0;
let totalScore=0, correctCount=0, distances=[], exactStreak=0, wrongStreak=0, level=1, training=false, trainingRegion="all", pendingPoints=0, pendingDistance=0, pendingCorrect=false;
let userName=localStorage.getItem("gq_username")||"Илиан";
let history=JSON.parse(localStorage.getItem("gq_history")||"[]");

function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const target=$(name+"View"); if(target) target.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  if(name==="leaderboard") renderLeaderboard();
  if(name==="history") renderHistory();
  if(name==="profile") renderProfile();
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
function updateUserUI(){
  $("headerUsername").textContent=userName;
  $("avatarInitials").textContent=userName.trim().charAt(0).toUpperCase()||"И";
}
function renderProfile(){
  $("profileGreeting").textContent=userName;
  $("profileAvatar").textContent=userName.trim().charAt(0).toUpperCase()||"И";
  $("usernameInput").value=userName;
}
function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}
function makeQueue(region="all",requestedLevel=1,isTraining=false){
  training=isTraining;trainingRegion=region;
  let candidates=LOCATIONS.filter(l=>(region==="all"||l.region===region)&&(!isTraining||l.difficulty===requestedLevel));
  if(candidates.length<5) candidates=LOCATIONS.filter(l=>region==="all"||l.region===region);
  if(candidates.length===0)candidates=LOCATIONS;
  gameQueue=shuffle(candidates);
  if(!isTraining) gameQueue=gameQueue.slice(0,5);
  roundIndex=0;totalScore=0;correctCount=0;distances=[];exactStreak=0;wrongStreak=0;level=requestedLevel;
  loadRound();
}
function startGame(){makeQueue("all",1,false);showView("game");setTimeout(initMap,100)}
function startPractice(){makeQueue($("regionSelect").value,Number($("practiceLevel").value),true);showView("game");setTimeout(initMap,100)}
function getCurrent(){return gameQueue[roundIndex%gameQueue.length]}
function loadRound(){
  currentLocation=getCurrent();guessMarker=null;correctMarker=null;pendingPoints=0;
  $("locationImage").src=currentLocation.image;$("locationImage").alt="Демо изображение: "+currentLocation.name;
  $("photoCaption").textContent="Къде се намира това място?";
  $("locationHint").textContent=currentLocation.hint;
  $("roundNumber").textContent=String(roundIndex+1).padStart(2,"0");
  $("roundLabel").textContent=training?`ТРЕНИРОВКА · ${roundIndex+1}`:`РУНД ${roundIndex+1} / 5`;
  $("progressFill").style.width=training?"100%":`${(roundIndex+1)*20}%`;
  $("difficultyLabel").textContent=`НИВО ${level} · ${["ЛЕСНО","СРЕДНО","ТРУДНО"][level-1]}`;
  $("guessStatus").textContent="Избери място върху картата, за да поставиш маркер.";
  $("confirmGuess").disabled=true;$("scoreLive").textContent=`${totalScore.toLocaleString("bg-BG")} точки`;
  if(map){map.setView([42.7,25.3],7);if(guessMarker){map.removeLayer(guessMarker);guessMarker=null}if(correctMarker){map.removeLayer(correctMarker);correctMarker=null}}
}
function initMap(){
  if(!window.L){$("gameMap").innerHTML='<div class="empty-state">Картата не може да се зареди. Провери интернет връзката.</div>';return}
  if(!map){
    map=L.map("gameMap",{scrollWheelZoom:true}).setView([42.7,25.3],7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    map.on("click",e=>placeGuess(e.latlng));
  }else{setTimeout(()=>map.invalidateSize(),100)}
  setTimeout(()=>map.invalidateSize(),150);
}
function placeGuess(latlng){
  if(!currentLocation)return;
  if(guessMarker)map.removeLayer(guessMarker);
  guessMarker=L.marker(latlng,{draggable:true}).addTo(map).bindPopup("Твоето предположение");
  guessMarker.on("dragend",()=>{const p=guessMarker.getLatLng();$("guessStatus").textContent=`Маркер: ${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`});
  $("guessStatus").textContent=`Маркер: ${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)}. Можеш да го преместиш.`;
  $("confirmGuess").disabled=false;
}
function haversine(lat1,lon1,lat2,lon2){
  const R=6371,rad=x=>x*Math.PI/180,dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function calculatePoints(distance){
  const base=[5000,5000,5000][level-1];
  return Math.max(0,Math.round(base*Math.exp(-distance/([180,120,75][level-1]))));
}
function confirmGuess(){
  if(!guessMarker)return;
  const p=guessMarker.getLatLng();
  pendingDistance=haversine(p.lat,p.lng,currentLocation.lat,currentLocation.lng);
  pendingPoints=calculatePoints(pendingDistance);
  pendingCorrect=pendingDistance<5;
  totalScore+=pendingPoints;distances.push(pendingDistance);
  if(pendingCorrect){correctCount++;exactStreak++;wrongStreak=0}
  else{wrongStreak++;exactStreak=0}
  if(exactStreak>=2){level=Math.min(3,level+1);exactStreak=0}
  if(wrongStreak>=2){level=Math.max(1,level-1);wrongStreak=0}
  $("feedbackSymbol").textContent=pendingCorrect?"✓":"⌖";
  $("feedbackTitle").textContent=pendingCorrect?"Точно попадение!":pendingDistance<50?"Много близо!":"Добър опит!";
  $("feedbackText").textContent=`Твоето предположение е на ${pendingDistance.toFixed(1)} km от ${currentLocation.name}. Спечели ${pendingPoints.toLocaleString("bg-BG")} точки.`;
  $("modalBackdrop").classList.add("show");$("modalBackdrop").setAttribute("aria-hidden","false");
}
function showRoundResult(){
  $("modalBackdrop").classList.remove("show");$("modalBackdrop").setAttribute("aria-hidden","true");
  $("resultImage").src=currentLocation.image;$("resultPlace").textContent=currentLocation.name;
  $("resultFact").textContent=currentLocation.fact;
  $("resultDistance").textContent=`${pendingDistance.toFixed(1)} km`;
  $("resultPoints").textContent=`+${pendingPoints.toLocaleString("bg-BG")}`;
  $("resultTitle").textContent=pendingCorrect?"Перфектно!":"Продължавай да откриваш!";
  $("resultSubtitle").textContent=pendingCorrect?"Разпозна мястото с впечатляваща точност.":"Всяко предположение е шанс да научиш нещо ново.";
  if(map){
    correctMarker=L.circleMarker([currentLocation.lat,currentLocation.lng],{radius:9,color:"#fff",weight:3,fillColor:"#5797e8",fillOpacity:1}).addTo(map).bindPopup("Правилно място: "+currentLocation.name);
    const bounds=L.latLngBounds([guessMarker.getLatLng(),[currentLocation.lat,currentLocation.lng]]);
    map.fitBounds(bounds.pad(.35),{maxZoom:9});
  }
  $("nextRoundButton").textContent=training?"Следващо място →":roundIndex===4?"Към финалния резултат →":"Следващ рунд →";
  showView("result");
}
function nextRound(){
  if(!training&&roundIndex>=4){finishGame();return}
  roundIndex++;
  if(training&&roundIndex>=gameQueue.length){gameQueue=shuffle(LOCATIONS.filter(l=>trainingRegion==="all"||l.region===trainingRegion));roundIndex=0}
  loadRound();showView("game");setTimeout(()=>{if(map)map.invalidateSize()},100);
}
function finishGame(){
  const avg=distances.reduce((a,b)=>a+b,0)/(distances.length||1);
  $("finalName").textContent=userName;$("finalScore").textContent=totalScore.toLocaleString("bg-BG");
  $("finalCorrect").textContent=`${correctCount}/5`;$("finalDistance").textContent=`${avg.toFixed(1)} km`;$("finalLevel").textContent=level;
  const record={name:userName,score:totalScore,correct:correctCount,avgDistance:avg,date:new Date().toISOString()};
  history.unshift(record);history=history.slice(0,30);localStorage.setItem("gq_history",JSON.stringify(history));
  showView("final");
}
function renderLeaderboard(){
  const mine=history.map(h=>({name:h.name,score:h.score,detail:"Твой последен резултат"}));
  const bestMine=mine.sort((a,b)=>b.score-a.score).slice(0,3);
  const players=[...DEMO_PLAYERS,...bestMine].sort((a,b)=>b.score-a.score).slice(0,10);
  $("leaderboardRows").innerHTML=players.map((p,i)=>`<div class="leader-row"><span class="rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}">${i+1}</span><div class="player-name"><b>${escapeHtml(p.name)} ${p.name===userName?'<span style="color:var(--lime)">· ТИ</span>':""}</b><small>${p.detail||"GeoQuest играч"}</small></div><strong class="leader-points">${p.score.toLocaleString("bg-BG")} XP</strong></div>`).join("")||'<div class="empty-state">Все още няма резултати.</div>';
}
function renderHistory(){
  $("historyRows").innerHTML=history.length?history.map(h=>`<div class="history-row"><span class="rank">⌖</span><div class="history-info"><b>${escapeHtml(h.name)} · ${h.correct}/5 точни</b><small>${new Date(h.date).toLocaleString("bg-BG",{dateStyle:"medium",timeStyle:"short"})} · средно ${Number(h.avgDistance).toFixed(1)} km</small></div><strong class="leader-points">${Number(h.score).toLocaleString("bg-BG")} XP</strong></div>`).join(""):'<div class="empty-state">Още нямаш записани игри. Започни първото си приключение!</div>';
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function bindEvents(){
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  $("startGameButton").addEventListener("click",startGame);$("classicCardButton").addEventListener("click",startGame);
  $("startPracticeButton").addEventListener("click",startPractice);
  $("confirmGuess").addEventListener("click",confirmGuess);$("showResultButton").addEventListener("click",showRoundResult);
  $("nextRoundButton").addEventListener("click",nextRound);$("playAgainButton").addEventListener("click",startGame);
  $("closeModal").addEventListener("click",()=>{$("modalBackdrop").classList.remove("show")});
  $("resetMarker").addEventListener("click",()=>{if(guessMarker&&map){map.removeLayer(guessMarker);guessMarker=null;$("confirmGuess").disabled=true;$("guessStatus").textContent="Маркерът е премахнат."}});
  $("profileButton").addEventListener("click",()=>showView("profile"));
  $("saveProfileButton").addEventListener("click",()=>{const v=$("usernameInput").value.trim();if(!v){toast("Въведи потребителско име.");return}userName=v;localStorage.setItem("gq_username",v);updateUserUI();renderProfile();toast("Профилът е обновен.")});
  $("clearHistoryButton").addEventListener("click",()=>{if(confirm("Сигурен ли си, че искаш да изтриеш историята?")){history=[];localStorage.setItem("gq_history","[]");renderHistory();toast("Историята е изчистена.")}});
  $("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))$("modalBackdrop").classList.remove("show")});
}
document.addEventListener("DOMContentLoaded",()=>{updateUserUI();bindEvents();});
