let allCards=[], filtered=[], index=0, flipped=false, known=new Set(JSON.parse(localStorage.getItem('knownCards')||'[]'));
let quizCurrent=null, score=0, total=0;
const $=id=>document.getElementById(id);
const els={cardsCount:$('cardsCount'),globalProgress:$('globalProgress'),progressText:$('progressText'),search:$('search'),categoryFilter:$('categoryFilter'),flashcard:$('flashcard'),cardCategory:$('cardCategory'),cardQuestion:$('cardQuestion'),cardHint:$('cardHint'),cardAnswer:$('cardAnswer'),cardCounter:$('cardCounter'),cardsList:$('cardsList'),quizCategory:$('quizCategory'),quizQuestion:$('quizQuestion'),answers:$('answers'),quizScore:$('quizScore'),feedback:$('feedback')};
async function init(){
  allCards=await fetch('cards.json').then(r=>r.json()); filtered=[...allCards];
  els.cardsCount.textContent=allCards.length;
  [...new Set(allCards.map(c=>c.category))].forEach(cat=>{const o=document.createElement('option');o.value=cat;o.textContent=cat;els.categoryFilter.appendChild(o)});
  bind(); applyFilters(); updateProgress();
}
function bind(){
 document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchView(b.dataset.view,b));
 els.search.oninput=applyFilters; els.categoryFilter.onchange=applyFilters;
 $('shuffleBtn').onclick=()=>{filtered.sort(()=>Math.random()-.5);index=0;renderCard()};
 $('resetBtn').onclick=()=>{known.clear();saveKnown();renderCard();renderList();updateProgress()};
 els.flashcard.onclick=flip; els.flashcard.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')flip()};
 $('nextCard').onclick=()=>move(1); $('prevCard').onclick=()=>move(-1);
 $('knowBtn').onclick=()=>{if(filtered[index]){known.add(filtered[index].id);saveKnown();updateProgress();move(1)}};
 $('startQuiz').onclick=newQuiz; $('explainBtn').onclick=()=>{if(quizCurrent) els.feedback.textContent='Odpowiedź: '+quizCurrent.answer};
 document.addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT')return; if(e.key===' ') {e.preventDefault(); flip()} if(e.key==='ArrowRight')move(1); if(e.key==='ArrowLeft')move(-1)});
}
function switchView(view,btn){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$(view).classList.add('active-view')}
function applyFilters(){const q=els.search.value.toLowerCase(), cat=els.categoryFilter.value; filtered=allCards.filter(c=>(cat==='all'||c.category===cat)&&(`${c.question} ${c.answer} ${c.category}`.toLowerCase().includes(q))); index=0; renderCard(); renderList();}
function renderCard(){flipped=false; els.flashcard.classList.remove('flipped'); if(!filtered.length){els.cardQuestion.textContent='Brak wyników'; els.cardAnswer.textContent='Zmień filtr lub wyszukiwarkę.'; els.cardCounter.textContent='';return} const c=filtered[index]; els.cardCategory.textContent=c.category; els.cardQuestion.textContent=c.question; els.cardHint.textContent='Podpowiedź: '+c.hint; els.cardAnswer.textContent=c.answer; els.cardCounter.textContent=`${index+1}/${filtered.length} ${known.has(c.id)?'• umiesz':'• do powtórki'}`;}
function flip(){flipped=!flipped; els.flashcard.classList.toggle('flipped',flipped)}
function move(d){if(!filtered.length)return; index=(index+d+filtered.length)%filtered.length; renderCard()}
function saveKnown(){localStorage.setItem('knownCards',JSON.stringify([...known]))}
function updateProgress(){const p=allCards.length?Math.round(known.size/allCards.length*100):0; els.globalProgress.style.width=p+'%'; els.progressText.textContent=`Przerobiono ${p}% (${known.size}/${allCards.length})`}
function renderList(){els.cardsList.innerHTML=''; filtered.forEach(c=>{const div=document.createElement('article'); div.className='list-card'; div.innerHTML=`<span class="pill">${c.category}</span><h3>${c.question}</h3><p>${c.answer}</p>`; els.cardsList.appendChild(div)})}
function newQuiz(){els.feedback.textContent=''; quizCurrent=allCards[Math.floor(Math.random()*allCards.length)]; els.quizCategory.textContent=quizCurrent.category; els.quizQuestion.textContent=quizCurrent.question; const wrong=allCards.filter(c=>c.id!==quizCurrent.id).sort(()=>Math.random()-.5).slice(0,3).map(c=>c.answer); const options=[quizCurrent.answer,...wrong].sort(()=>Math.random()-.5); els.answers.innerHTML=''; options.forEach(opt=>{const b=document.createElement('button'); b.className='answer'; b.textContent=opt; b.onclick=()=>checkAnswer(b,opt); els.answers.appendChild(b)});}
function checkAnswer(btn,opt){if(!quizCurrent)return; total++; const ok=opt===quizCurrent.answer; if(ok)score++; [...els.answers.children].forEach(b=>{b.disabled=true; if(b.textContent===quizCurrent.answer)b.classList.add('correct')}); if(!ok)btn.classList.add('wrong'); els.feedback.textContent=ok?'Dobrze!':'Źle — zobacz poprawną odpowiedź na zielono.'; els.quizScore.textContent=`Wynik: ${score}/${total}`;}
init();
