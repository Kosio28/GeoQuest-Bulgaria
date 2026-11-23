const translations = {
  bg: {
    homeEyebrow:"ОТКРИЙ БЪЛГАРИЯ ПО НОВ НАЧИН",homeTitle:'Колко добре познаваш <span>България?</span>',homeDescription:"Разгледай снимката, открий мястото върху картата и събери точки. Пет въпроса те делят от титлата Географски експерт.",startGame:"Започни играта",howToPlay:"Как се играе?",questions:"въпроса",maxPoints:"максимум точки",languages:"езика",exploreBulgaria:"Изследвай България",simpleRules:"ЛЕСНО Е",howTitle:"Три стъпки до победата",step1Title:"Разгледай снимката",step1Text:"Виж географския обект и помисли къде се намира.",step2Title:"Постави маркер",step2Text:"Избери място върху интерактивната карта на България.",step3Title:"Събери точки",step3Text:"Колкото по-точен си, толкова повече точки получаваш.",footerText:"Учи. Откривай. Играй.",
    score:"Точки",exitGame:"← Изход от играта",yourMission:"ТВОЯТА МИСИЯ",normal:"Нормална",findLocation:"Открий местоположението",mapInstruction:"Разгледай снимката и постави маркер върху картата там, където мислиш, че се намира обектът.",selectOnMap:"Избери място върху картата.",confirmAnswer:"Потвърди отговора",nextQuestion:"Следващ въпрос →",mapLabel:"ИНТЕРАКТИВНА КАРТА",mapTitle:"Карта на България",mapHint:"Натисни, за да поставиш маркер",yourGuess:"Твоят избор",correctLocation:"Правилно място",loadingQuestions:"Зареждане на въпросите...",roundComplete:"МИСИЯТА Е ЗАВЪРШЕНА",yourResult:"Твоят резултат",playAgain:"Играй отново ↻",homeButton:"Начална страница",questionOf:"Въпрос",of:"от",markerSelected:"Маркерът е поставен. Можеш да го преместиш или да потвърдиш.",noMarker:"Първо избери място върху картата.",correct:"Страхотно попадение!",incorrect:"Добър опит!",distance:"Разстояние до правилното място",fact:"Знаеше ли?",points:"точки",errorTitle:"Не успяхме да заредим играта",tryAgain:"Опитай отново",excellent:"Географски експерт!",veryGood:"Отличен изследовател!",good:"Добър познавач!",keepGoing:"Продължавай да изследваш!",summary:"Завърши всичките 5 въпроса. Ето как се справи:",questionLabel:"Въпрос",rankExcellent:"Географски експерт",rankVeryGood:"Отличен изследовател",rankGood:"Добър познавач",rankTry:"Начинаещ изследовател",noResults:"Няма запазен резултат. Започни нова игра."
  },
  en: {
    homeEyebrow:"DISCOVER BULGARIA IN A NEW WAY",homeTitle:'How well do you know <span>Bulgaria?</span>',homeDescription:"Look at the photo, find the place on the map and collect points. Five questions stand between you and the title of Geography Expert.",startGame:"Start game",howToPlay:"How to play?",questions:"questions",maxPoints:"maximum points",languages:"languages",exploreBulgaria:"Explore Bulgaria",simpleRules:"IT'S SIMPLE",howTitle:"Three steps to victory",step1Title:"Look at the photo",step1Text:"Study the geographical place and think where it is located.",step2Title:"Place a marker",step2Text:"Choose a place on the interactive map of Bulgaria.",step3Title:"Earn points",step3Text:"The more accurate you are, the more points you earn.",footerText:"Learn. Explore. Play.",
    score:"Score",exitGame:"← Exit game",yourMission:"YOUR MISSION",normal:"Normal",findLocation:"Find the location",mapInstruction:"Look at the photo and place a marker on the map where you think the place is located.",selectOnMap:"Select a place on the map.",confirmAnswer:"Submit answer",nextQuestion:"Next question →",mapLabel:"INTERACTIVE MAP",mapTitle:"Map of Bulgaria",mapHint:"Click to place a marker",yourGuess:"Your guess",correctLocation:"Correct location",loadingQuestions:"Loading questions...",roundComplete:"MISSION COMPLETE",yourResult:"Your result",playAgain:"Play again ↻",homeButton:"Home page",questionOf:"Question",of:"of",markerSelected:"Marker placed. You can move it or submit your answer.",noMarker:"Select a place on the map first.",correct:"Great guess!",incorrect:"Good try!",distance:"Distance to the correct location",fact:"Did you know?",points:"points",errorTitle:"We couldn't load the game",tryAgain:"Try again",excellent:"Geography Expert!",veryGood:"Excellent Explorer!",good:"Good Geographer!",keepGoing:"Keep exploring!",summary:"You completed all 5 questions. Here's how you did:",questionLabel:"Question",rankExcellent:"Geography Expert",rankVeryGood:"Excellent Explorer",rankGood:"Good Geographer",rankTry:"Explorer in Training",noResults:"No saved result. Start a new game."
  }
};
export function getLanguage(){return localStorage.getItem("gq-language") || "bg";}
export function setLanguage(lang){localStorage.setItem("gq-language",lang);document.documentElement.lang=lang;}
export function t(key){const lang=getLanguage();return translations[lang]?.[key] ?? translations.bg[key] ?? key;}
export function applyTranslations(){
  const lang=getLanguage();document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const value=translations[lang]?.[el.dataset.i18n];
    if(value!==undefined) el.innerHTML=value;
  });
  const toggle=document.getElementById("languageToggle");
  if(toggle) toggle.textContent=lang==="bg"?"EN":"BG";
}
export function setupLanguageToggle(onChange){
  const button=document.getElementById("languageToggle");
  if(!button)return;
  button.addEventListener("click",()=>{
    setLanguage(getLanguage()==="bg"?"en":"bg");
    applyTranslations();
    if(onChange)onChange();
  });
}
