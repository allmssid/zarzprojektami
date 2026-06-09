let allCards = [];
let filtered = [];
let index = 0;
let flipped = false;
let known = new Set(JSON.parse(localStorage.getItem('knownCards') || '[]'));
let wrongCards = new Set(JSON.parse(localStorage.getItem('wrongCards') || '[]'));

let quizDeck = [];
let quizIndex = -1;
let quizCurrent = null;
let score = 0;
let answeredTotal = 0;
let answeredCurrent = false;
let quizMode = 'all';

const $ = id => document.getElementById(id);
const els = {
  cardsCount: $('cardsCount'), globalProgress: $('globalProgress'), progressText: $('progressText'),
  search: $('search'), categoryFilter: $('categoryFilter'), unknownOnly: $('unknownOnly'),
  flashcard: $('flashcard'), cardCategory: $('cardCategory'), cardQuestion: $('cardQuestion'), cardHint: $('cardHint'), cardAnswer: $('cardAnswer'), cardCounter: $('cardCounter'),
  cardsList: $('cardsList'), categoryStats: $('categoryStats'),
  quizCategory: $('quizCategory'), quizCounter: $('quizCounter'), quizRemaining: $('quizRemaining'), quizProgressBar: $('quizProgressBar'),
  quizQuestion: $('quizQuestion'), answers: $('answers'), quizScore: $('quizScore'), feedback: $('feedback')
};

async function init() {
  try {
    allCards = await fetch('cards.json').then(response => {
      if (!response.ok) throw new Error('Nie udało się wczytać cards.json');
      return response.json();
    });
    filtered = [...allCards];
    els.cardsCount.textContent = allCards.length;

    [...new Set(allCards.map(card => card.category))].sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      els.categoryFilter.appendChild(option);
    });

    bindEvents();
    applyFilters();
    updateProgress();
    resetQuizProgressView();
    renderStats();
  } catch (error) {
    els.cardQuestion.textContent = 'Błąd ładowania danych';
    els.cardAnswer.textContent = error.message;
  }
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => switchView(button.dataset.view, button);
  });

  els.search.oninput = applyFilters;
  els.categoryFilter.onchange = applyFilters;
  els.unknownOnly.onchange = applyFilters;

  $('shuffleBtn').onclick = () => {
    filtered.sort(() => Math.random() - 0.5);
    index = 0;
    renderCard();
  };

  $('resetBtn').onclick = () => {
    known.clear();
    wrongCards.clear();
    saveSets();
    applyFilters();
    updateProgress();
    renderStats();
    resetQuizProgressView();
  };

  els.flashcard.onclick = flip;
  els.flashcard.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flip();
    }
  };

  $('nextCard').onclick = () => move(1);
  $('prevCard').onclick = () => move(-1);

  $('knowBtn').onclick = () => {
    const card = filtered[index];
    if (!card) return;
    known.add(card.id);
    wrongCards.delete(card.id);
    saveSets();
    updateProgress();
    renderStats();
    if (els.unknownOnly.checked) applyFilters();
    else move(1);
  };

  $('dontKnowBtn').onclick = () => {
    const card = filtered[index];
    if (!card) return;
    known.delete(card.id);
    wrongCards.add(card.id);
    saveSets();
    updateProgress();
    renderStats();
    move(1);
  };

  $('startQuiz').onclick = handleQuizMainButton;
  $('wrongQuiz').onclick = startWrongQuiz;
  $('explainBtn').onclick = () => {
    if (quizCurrent) els.feedback.textContent = 'Odpowiedź: ' + quizCurrent.answer;
  };

  document.addEventListener('keydown', event => {
    if (document.activeElement && ['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return;
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
  if (view === 'stats') renderStats();
}

function applyFilters() {
  const query = els.search.value.toLowerCase().trim();
  const category = els.categoryFilter.value;
  filtered = allCards.filter(card => {
    const matchesCategory = category === 'all' || card.category === category;
    const matchesQuery = `${card.question} ${card.answer} ${card.category} ${card.hint}`.toLowerCase().includes(query);
    const matchesUnknown = !els.unknownOnly.checked || !known.has(card.id);
    return matchesCategory && matchesQuery && matchesUnknown;
  });
  index = 0;
  renderCard();
  renderList();
}

function renderCard() {
  flipped = false;
  els.flashcard.classList.remove('flipped');

  if (!filtered.length) {
    els.cardCategory.textContent = 'Brak';
    els.cardQuestion.textContent = 'Brak fiszek dla wybranych filtrów';
    els.cardHint.textContent = '';
    els.cardAnswer.textContent = 'Zmień kategorię, wyszukiwarkę albo odznacz „Tylko nieoznaczone”.';
    els.cardCounter.textContent = '';
    return;
  }

  const card = filtered[index];
  els.cardCategory.textContent = card.category;
  els.cardQuestion.textContent = card.question;
  els.cardHint.textContent = card.hint ? 'Podpowiedź: ' + card.hint : '';
  els.cardAnswer.textContent = card.answer;

  const status = known.has(card.id) ? 'umiesz' : (wrongCards.has(card.id) ? 'błędne / do powtórki' : 'do powtórki');
  els.cardCounter.textContent = `${index + 1}/${filtered.length} • ${status}`;
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

function saveSets() {
  localStorage.setItem('knownCards', JSON.stringify([...known]));
  localStorage.setItem('wrongCards', JSON.stringify([...wrongCards]));
}

function updateProgress() {
  const percent = allCards.length ? Math.round((known.size / allCards.length) * 100) : 0;
  els.globalProgress.style.width = percent + '%';
  els.progressText.textContent = `Przerobiono ${percent}% (${known.size}/${allCards.length}) • błędne: ${wrongCards.size}`;
}

function renderList() {
  els.cardsList.innerHTML = '';
  filtered.forEach(card => {
    const article = document.createElement('article');
    article.className = 'list-card';
    const status = known.has(card.id) ? '✓ umiesz' : (wrongCards.has(card.id) ? '✗ błędne' : 'do nauki');
    article.innerHTML = `<span class="pill">${escapeHtml(card.category)}</span><span class="status">${status}</span><h3>${escapeHtml(card.question)}</h3><p>${escapeHtml(card.answer)}</p>`;
    els.cardsList.appendChild(article);
  });
}

function renderStats() {
  if (!els.categoryStats) return;
  const categories = [...new Set(allCards.map(card => card.category))].sort();
  els.categoryStats.innerHTML = '';
  categories.forEach(category => {
    const cards = allCards.filter(card => card.category === category);
    const knownCount = cards.filter(card => known.has(card.id)).length;
    const wrongCount = cards.filter(card => wrongCards.has(card.id)).length;
    const percent = cards.length ? Math.round((knownCount / cards.length) * 100) : 0;
    const row = document.createElement('article');
    row.className = 'stat-row';
    row.innerHTML = `<div><strong>${escapeHtml(category)}</strong><p>${knownCount}/${cards.length} opanowane • błędne: ${wrongCount}</p></div><div class="mini-progress"><span style="width:${percent}%"></span></div>`;
    els.categoryStats.appendChild(row);
  });
}

function resetQuizProgressView() {
  quizDeck = [];
  quizIndex = -1;
  quizCurrent = null;
  score = 0;
  answeredTotal = 0;
  answeredCurrent = false;
  quizMode = 'all';
  const totalQuestions = allCards.length || 0;
  els.quizCategory.textContent = 'Quiz';
  els.quizCounter.textContent = `Pytanie 0 / ${totalQuestions}`;
  els.quizRemaining.textContent = `Zostało: ${totalQuestions}`;
  els.quizScore.textContent = 'Wynik: 0/0';
  els.quizQuestion.textContent = 'Kliknij start, żeby rozpocząć quiz.';
  els.answers.innerHTML = '';
  els.feedback.textContent = '';
  $('startQuiz').textContent = 'Start quizu';
  els.quizProgressBar.style.width = '0%';
}

function startQuizSession(deck, mode = 'all') {
  if (!deck.length) {
    els.feedback.textContent = mode === 'wrong' ? 'Nie masz błędnych odpowiedzi do powtórki.' : 'Brak pytań do quizu.';
    return;
  }
  quizDeck = [...deck].sort(() => Math.random() - 0.5);
  quizMode = mode;
  quizIndex = 0;
  score = 0;
  answeredTotal = 0;
  answeredCurrent = false;
  quizCurrent = quizDeck[quizIndex];
  renderQuizQuestion();
}

function startWrongQuiz() {
  const deck = allCards.filter(card => wrongCards.has(card.id));
  startQuizSession(deck, 'wrong');
}

function handleQuizMainButton() {
  const text = $('startQuiz').textContent.toLowerCase();
  if (!quizDeck.length || text.includes('start') || text.includes('od nowa')) {
    startQuizSession(allCards, 'all');
    return;
  }
  nextQuizQuestion();
}

function nextQuizQuestion() {
  if (!quizDeck.length) {
    startQuizSession(allCards, 'all');
    return;
  }
  if (quizIndex >= quizDeck.length - 1) {
    finishQuiz();
    return;
  }
  quizIndex += 1;
  answeredCurrent = false;
  quizCurrent = quizDeck[quizIndex];
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (!quizCurrent) return;
  els.feedback.textContent = '';
  els.quizCategory.textContent = quizMode === 'wrong' ? 'Powtórka błędnych' : quizCurrent.category;
  els.quizQuestion.textContent = quizCurrent.question;
  $('startQuiz').textContent = 'Następne pytanie →';
  updateQuizProgressView();

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

function updateQuizProgressView() {
  const totalQuestions = quizDeck.length || allCards.length || 0;
  const currentQuestion = quizCurrent ? quizIndex + 1 : 0;
  const remaining = Math.max(totalQuestions - currentQuestion, 0);
  const percent = totalQuestions ? Math.round((currentQuestion / totalQuestions) * 100) : 0;
  els.quizCounter.textContent = `Pytanie ${currentQuestion} / ${totalQuestions}`;
  els.quizRemaining.textContent = `Zostało: ${remaining}`;
  els.quizScore.textContent = `Wynik: ${score}/${answeredTotal}`;
  els.quizProgressBar.style.width = percent + '%';
}

function checkAnswer(button, option) {
  if (!quizCurrent || answeredCurrent) return;
  answeredCurrent = true;
  answeredTotal += 1;

  const isCorrect = option === quizCurrent.answer;
  if (isCorrect) {
    score += 1;
    known.add(quizCurrent.id);
    wrongCards.delete(quizCurrent.id);
  } else {
    known.delete(quizCurrent.id);
    wrongCards.add(quizCurrent.id);
  }
  saveSets();
  updateProgress();
  renderStats();

  [...els.answers.children].forEach(answerButton => {
    answerButton.disabled = true;
    if (answerButton.textContent === quizCurrent.answer) answerButton.classList.add('correct');
  });
  if (!isCorrect) button.classList.add('wrong');

  els.feedback.textContent = isCorrect ? 'Dobrze!' : 'Źle — poprawna odpowiedź jest zaznaczona na zielono.';
  updateQuizProgressView();
}

function finishQuiz() {
  const totalQuestions = quizDeck.length || 0;
  const percent = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
  quizCurrent = null;
  answeredCurrent = false;
  els.quizCategory.textContent = 'Koniec quizu';
  els.quizQuestion.textContent = `Quiz zakończony. Wynik: ${score}/${answeredTotal} (${percent}%).`;
  els.answers.innerHTML = '';
  els.feedback.textContent = wrongCards.size ? `Masz ${wrongCards.size} błędnych fiszek. Możesz kliknąć „Powtórz błędne”.` : 'Nie masz błędnych odpowiedzi. Dobra robota.';
  $('startQuiz').textContent = 'Rozpocznij od nowa';
  els.quizCounter.textContent = `Pytanie ${totalQuestions} / ${totalQuestions}`;
  els.quizRemaining.textContent = 'Zostało: 0';
  els.quizScore.textContent = `Wynik: ${score}/${answeredTotal}`;
  els.quizProgressBar.style.width = '100%';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
}

init();
