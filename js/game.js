import {fetchChallenges} from "./supabase.js";
import {calculateDistanceKm,calculatePoints,shuffle} from "./scoring.js";
import {applyTranslations,setupLanguageToggle,t} from "./translations.js";

const $ = id => document.getElementById(id);
const state = {questions:[],index:0,score:0,marker:null,answered:false,results:[]};
let map, playerMarker, correctMarker, answerLine;

function initMap(){
  map=L.map("map",{scrollWheelZoom:true}).setView([42.7,25.35],7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  map.on("click",event=>{
    if(state.answered)return;
    state.marker={lat:event.latlng.lat,lng:event.latlng.lng};
    if(playerMarker)playerMarker.setLatLng(event.latlng);
    else playerMarker=L.marker(event.latlng).addTo(map);
    $("selectionStatus").textContent=t("markerSelected");
    $("submitAnswer").disabled=false;
  });
}
function clearAnswerLayers(){
  [playerMarker,correctMarker,answerLine].forEach(layer=>{if(layer)map.removeLayer(layer);});
  playerMarker=null;correctMarker=null;answerLine=null;state.marker=null;
}
function currentQuestion(){return state.questions[state.index];}
function getLocation(question){return Array.isArray(question.locations)?question.locations[0]:question.locations;}
function renderQuestion(){
  const question=currentQuestion(),location=getLocation(question);
  state.answered=false;clearAnswerLayers();
  $("questionCounter").textContent=`${t("questionOf")} ${state.index+1} ${t("of")} 5`;
  $("progressFill").style.width=`${((state.index+1)/5)*100}%`;
  $("scoreValue").textContent=state.score;
  $("challengeQuestion").textContent=question.question || location.name;
  $("challengeImage").src=question.image_url || "";
  $("challengeImage").alt=location.name || "Geographical location";
  $("challengeImage").onerror=()=>{$("challengeImage").style.opacity=".25";};
  $("challengeImage").onload=()=>{$("challengeImage").style.opacity="1";};
  const difficulty=Number(question.difficulty||1);
  $("difficultyTag").innerHTML=`● ${difficulty>=3?(getLanguageSafe()==="bg"?"Трудна":"Hard"):difficulty===2?(getLanguageSafe()==="bg"?"Средна":"Medium"):t("normal")}`;
  $("selectionStatus").textContent=t("selectOnMap");
  $("submitAnswer").disabled=true;
  $("feedbackBox").hidden=true;
  $("submitAnswer").hidden=false;
}
function getLanguageSafe(){return document.documentElement.lang||"bg";}
function updateLanguage(){
  if(!state.questions.length)return;
  $("questionCounter").textContent=`${t("questionOf")} ${state.index+1} ${t("of")} 5`;
  $("scoreValue").textContent=state.score;
  const question=currentQuestion(),location=getLocation(question);
  const difficulty=Number(question.difficulty||1);
  const lang=getLanguageSafe();
  $("difficultyTag").innerHTML=`● ${difficulty>=3?(lang==="bg"?"Трудна":"Hard"):difficulty===2?(lang==="bg"?"Средна":"Medium"):t("normal")}`;
  if(state.answered){
    const last=state.results[state.results.length-1];
    $("feedbackTitle").textContent=last.distanceKm<=5?t("correct"):t("incorrect");
    $("earnedPoints").textContent=`+${last.points} ${t("points")}`;
    $("feedbackDistance").textContent=`${t("distance")}: ${last.distanceKm.toFixed(1)} km`;
    $("factText").textContent=location.fact?`${t("fact")} ${location.fact}`:`${t("fact")} ${location.name}`;
    $("nextQuestion").textContent=state.index===4?(lang==="bg"?"Виж резултата →":"See results →"):t("nextQuestion");
  }else{
    $("selectionStatus").textContent=state.marker?t("markerSelected"):t("selectOnMap");
  }
}
function submitAnswer(){
  if(!state.marker){$("selectionStatus").textContent=t("noMarker");return;}
  if(state.answered)return;
  state.answered=true;
  const question=currentQuestion(),location=getLocation(question);
  const distance=calculateDistanceKm(state.marker.lat,state.marker.lng,Number(location.latitude),Number(location.longitude));
  const points=calculatePoints(distance);
  state.score+=points;
  state.results.push({name:location.name,distanceKm:distance,points});
  $("scoreValue").textContent=state.score;
  correctMarker=L.circleMarker([Number(location.latitude),Number(location.longitude)],{radius:9,color:"#fff",weight:3,fillColor:"#d34e48",fillOpacity:1}).addTo(map);
  answerLine=L.polyline([[state.marker.lat,state.marker.lng],[Number(location.latitude),Number(location.longitude)]],{color:"#d34e48",dashArray:"6 7",weight:3}).addTo(map);
  map.fitBounds(L.latLngBounds([[state.marker.lat,state.marker.lng],[Number(location.latitude),Number(location.longitude)]]).pad(.35),{maxZoom:9});
  const lang=getLanguageSafe();
  $("feedbackTitle").textContent=distance<=5?t("correct"):t("incorrect");
  $("earnedPoints").textContent=`+${points} ${t("points")}`;
  $("feedbackDistance").textContent=`${t("distance")}: ${distance.toFixed(1)} km`;
  const fact=location.fact||"";
  $("factText").textContent=fact?`${t("fact")} ${fact}`:`${t("fact")} ${location.name}`;
  $("feedbackBox").hidden=false;$("submitAnswer").hidden=true;
  $("selectionStatus").textContent=location.name;
  $("nextQuestion").textContent=state.index===4?(lang==="bg"?"Виж резултата →":"See results →"):t("nextQuestion");
}
function nextQuestion(){
  if(!state.answered)return;
  if(state.index===4){
    sessionStorage.setItem("gq-result",JSON.stringify({score:state.score,results:state.results}));
    window.location.href="result.html";return;
  }
  state.index++;renderQuestion();
}
function showError(error){
  const overlay=$("loadingOverlay");
  overlay.innerHTML=`<div class="panel error-panel"><h2>${t("errorTitle")}</h2><p>${String(error.message||error)}</p><button class="button button-primary" id="retryLoad">${t("tryAgain")}</button></div>`;
  $("retryLoad").addEventListener("click",()=>window.location.reload());
}
async function start(){
  applyTranslations();
  setupLanguageToggle(updateLanguage);
  initMap();
  $("submitAnswer").addEventListener("click",submitAnswer);
  $("nextQuestion").addEventListener("click",nextQuestion);
  try{
    const all=await fetchChallenges();
    state.questions=shuffle(all).slice(0,5);
    $("loadingOverlay").hidden=true;
    renderQuestion();
    setTimeout(()=>map.invalidateSize(),150);
  }catch(error){showError(error);}
}
start();
