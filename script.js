let allCards = [];
let filtered = [];
let index = 0;
let flipped = false;
let known = new Set(JSON.parse(localStorage.getItem('knownCards') || '[]'));

let quizCurrent = null;
let score = 0;
let answeredTotal = 0;
let quizDeck = [];
let quizIndex = -1;

const $ = id => document.getElementById(id);
const els = {
  cardsCount: $('cardsCount'),
  globalProgress: $('globalProgress'),
  progressText: $('progressText'),
  search: $('search'),
  categoryFilter: $('categoryFilter'),
  flashcard: $('flashcard'),
  cardCategory: $('cardCategory'),
  cardQuestion: $('cardQuestion'),
  cardHint: $('cardHint'),
  cardAnswer: $('cardAnswer'),
  cardCounter: $('cardCounter'),
  cardsList: $('cardsList'),
  quizCategory: $('quizCategory'),
  quizCounter: $('quizCounter'),
  quizRemaining: $('quizRemaining'),
  quizProgressBar: $('quizProgressBar'),
  quizQuestion: $('quizQuestion'),
  answers: $('answers'),
  quizScore: $('quizScore'),
  feedback: $('feedback')
};

async function init() {
  allCards = await fetch('cards.json').then(r => r.json());
  filtered = [...allCards];
  els.cardsCount.textContent = allCards.length;

  [...new Set(allCards.map(c => c.category))].forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    els.categoryFilter.appendChild(option);
  });

  bind();
  applyFilters();
  updateProgress();
  resetQuizProgressView();
}

function bind() {
  document.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => switchView(button.dataset.view, button);
  });

  els.search.oninput = applyFilters;
  els.categoryFilter.onchange = applyFilters;

  $('shuffleBtn').onclick = () => {
    filtered.sort(() => Math.random() - 0.5);
    index = 0;
    renderCard();
  };

  $('resetBtn').onclick = () => {
    known.clear();
    saveKnown();
    renderCard();
    renderList();
    updateProgress();
  };

  els.flashcard.onclick = flip;
  els.flashcard.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') flip();
  };

  $('nextCard').onclick = () => move(1);
  $('prevCard').onclick = () => move(-1);

  $('knowBtn').onclick = () => {
    if (filtered[index]) {
      known.add(filtered[index].id);
      saveKnown();
      updateProgress();
      move(1);
    }
  };

  $('startQuiz').onclick = newQuiz;
  $('explainBtn').onclick = () => {
    if (quizCurrent) els.feedback.textContent = 'Odpowiedź: ' + quizCurrent.answer;
  };

  document.addEventListener('keydown', event => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (event.key === ' ') {
      event.preventDefault();
      flip();
    }
    if (event.key === 'ArrowRight') move(1);
    if (event.key === 'ArrowLeft') move(-1);
  });
}

function switchView(view, button) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  button.classList.add('active');
  document.querySelectorAll('.view').forEach(section => section.classList.remove('active-view'));
  $(view).classList.add('active-view');
}

function applyFilters() {
  const query = els.search.value.toLowerCase();
  const category = els.categoryFilter.value;
  filtered = allCards.filter(card =>
    (category === 'all' || card.category === category) &&
    (`${card.question} ${card.answer} ${card.category}`.toLowerCase().includes(query))
  );
  index = 0;
  renderCard();
  renderList();
}

function renderCard() {
  flipped = false;
  els.flashcard.classList.remove('flipped');

  if (!filtered.length) {
    els.cardQuestion.textContent = 'Brak wyników';
    els.cardAnswer.textContent = 'Zmień filtr lub wyszukiwarkę.';
    els.cardCounter.textContent = '';
    return;
  }

  const card = filtered[index];
  els.cardCategory.textContent = card.category;
  els.cardQuestion.textContent = card.question;
  els.cardHint.textContent = 'Podpowiedź: ' + card.hint;
  els.cardAnswer.textContent = card.answer;
  els.cardCounter.textContent = `${index + 1}/${filtered.length} ${known.has(card.id) ? '• umiesz' : '• do powtórki'}`;
}

function flip() {
  flipped = !flipped;
  els.flashcard.classList.toggle('flipped', flipped);
}

function move(direction) {
  if (!filtered.length) return;
  index = (index + direction + filtered.length) % filtered.length;
  renderCard();
}

function saveKnown() {
  localStorage.setItem('knownCards', JSON.stringify([...known]));
}

function updateProgress() {
  const percent = allCards.length ? Math.round(known.size / allCards.length * 100) : 0;
  els.globalProgress.style.width = percent + '%';
  els.progressText.textContent = `Przerobiono ${percent}% (${known.size}/${allCards.length})`;
}

function renderList() {
  els.cardsList.innerHTML = '';
  filtered.forEach(card => {
    const div = document.createElement('article');
    div.className = 'list-card';
    div.innerHTML = `<span class="pill">${card.category}</span><h3>${card.question}</h3><p>${card.answer}</p>`;
    els.cardsList.appendChild(div);
  });
}

function resetQuizProgressView() {
  const totalQuestions = allCards.length || 0;
  els.quizCounter.textContent = `Pytanie 0 / ${totalQuestions}`;
  els.quizRemaining.textContent = `Zostało: ${totalQuestions}`;
  els.quizScore.textContent = 'Wynik: 0/0';
  if (els.quizProgressBar) els.quizProgressBar.style.width = '0%';
}

function updateQuizProgressView() {
  const totalQuestions = quizDeck.length || allCards.length || 0;
  const currentQuestion = quizCurrent ? quizIndex + 1 : 0;
  const remaining = Math.max(totalQuestions - currentQuestion, 0);
  const percent = totalQuestions ? Math.round((currentQuestion / totalQuestions) * 100) : 0;

  els.quizCounter.textContent = `Pytanie ${currentQuestion} / ${totalQuestions}`;
  els.quizRemaining.textContent = `Zostało: ${remaining}`;
  if (els.quizProgressBar) els.quizProgressBar.style.width = percent + '%';
}

function newQuiz() {
  els.feedback.textContent = '';

  if (!quizDeck.length || quizIndex >= quizDeck.length - 1) {
    quizDeck = [...allCards].sort(() => Math.random() - 0.5);
    quizIndex = -1;
    score = 0;
    answeredTotal = 0;
    els.quizScore.textContent = 'Wynik: 0/0';
  }

  quizIndex++;
  quizCurrent = quizDeck[quizIndex];
  updateQuizProgressView();

  els.quizCategory.textContent = quizCurrent.category;
  els.quizQuestion.textContent = quizCurrent.question;

  const wrongAnswers = allCards
    .filter(card => card.id !== quizCurrent.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(card => card.answer);

  const options = [quizCurrent.answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  els.answers.innerHTML = '';

  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'answer';
    button.textContent = option;
    button.onclick = () => checkAnswer(button, option);
    els.answers.appendChild(button);
  });
}

function checkAnswer(button, option) {
  if (!quizCurrent) return;
  answeredTotal++;

  const isCorrect = option === quizCurrent.answer;
  if (isCorrect) score++;

  [...els.answers.children].forEach(answerButton => {
    answerButton.disabled = true;
    if (answerButton.textContent === quizCurrent.answer) answerButton.classList.add('correct');
  });

  if (!isCorrect) button.classList.add('wrong');

  els.feedback.textContent = isCorrect ? 'Dobrze!' : 'Źle — zobacz poprawną odpowiedź na zielono.';
  els.quizScore.textContent = `Wynik: ${score}/${answeredTotal}`;
  updateQuizProgressView();
}

init();
