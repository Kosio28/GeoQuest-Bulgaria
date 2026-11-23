import {applyTranslations,setupLanguageToggle,t} from "./translations.js";
applyTranslations();setupLanguageToggle(render);
const result=JSON.parse(sessionStorage.getItem("gq-result")||"null");
function render(){
  if(!result){
    document.getElementById("resultRank").textContent=t("noResults");
    document.getElementById("resultSummary").textContent="";
    document.getElementById("finalScore").textContent="—";
    return;
  }
  document.getElementById("finalScore").textContent=result.score;
  let rankKey=result.score>=4500?"rankExcellent":result.score>=3500?"rankVeryGood":result.score>=2000?"rankGood":"rankTry";
  document.getElementById("resultRank").textContent=t(rankKey);
  document.getElementById("resultSummary").textContent=t("summary");
  document.getElementById("resultBreakdown").innerHTML=result.results.map((item,index)=>`
    <div class="result-row"><span>${t("questionLabel")} ${index+1}: ${escapeHtml(item.name)}</span><strong>${item.points} ${t("points")}</strong></div>
  `).join("");
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
document.getElementById("playAgain").addEventListener("click",()=>{sessionStorage.removeItem("gq-result");window.location.href="game.html";});
render();
