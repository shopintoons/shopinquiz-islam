const QUIZ_URL = "./assets/quiz_islam_200.json";
const MAX_PER_GAME = 20;

const POINTS_BY_DIFFICULTY = {
  "Facile": 10,
  "Moyen": 20,
  "Difficile": 30,
  "Expert": 40,
};

const SOUNDS = {
  correct: "assets/sounds/correct.mp3",
  wrong: "assets/sounds/wrong.mp3",
  timeout: "assets/sounds/timeout.mp3",
  click: "assets/sounds/click.mp3",
};

const el = (id) => document.getElementById(id);

const ui = {
  progress: el("progress"),
  score: el("score"),
  points: el("points"),
  difficulty: el("difficulty"),

  question: el("question"),
  answers: el("answers"),

  feedback: el("feedback"),
  resultLine: el("resultLine"),
  explanation: el("explanation"),
  btnNext: el("btnNext"),

  btnStart: el("btnStart"),
  btnRestart: el("btnRestart"),
  toggleSound: el("toggleSound"),

  barFill: el("barFill"),
};

let all = [];
let game = [];        // 20 questions
let index = 0;
let score = 0;        // points total
let locked = true;

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function playSound(key){
  if (!ui.toggleSound?.checked) return;
  const src = SOUNDS[key];
  if (!src) return;
  const a = new Audio(src);
  a.volume = 0.6;
  a.play().catch(()=>{});
}

function getDifficulty(q){
  // si ton JSON a "difficulty", on l’utilise. sinon "Moyen" par défaut.
  const d = (q.difficulty || "Moyen").toString().trim();
  return POINTS_BY_DIFFICULTY[d] ? d : "Moyen";
}

function getPoints(q){
  const d = getDifficulty(q);
  return POINTS_BY_DIFFICULTY[d] ?? 20;
}

function setProgressUI(){
  ui.progress.textContent = String(index + 1);
  ui.score.textContent = String(score);
  const pct = Math.round(((index) / MAX_PER_GAME) * 100);
  ui.barFill.style.width = `${pct}%`;
}

function resetFeedback(){
  ui.feedback.classList.add("hidden");
  ui.resultLine.textContent = "";
  ui.explanation.textContent = "";
}

function lockAnswers(lock){
  locked = lock;
  const btns = ui.answers.querySelectorAll("button");
  btns.forEach(b => {
    b.classList.toggle("disabled", lock);
    b.disabled = lock;
  });
}

function render(){
  resetFeedback();

  const q = game[index];
  const diff = getDifficulty(q);
  const pts = getPoints(q);

  ui.difficulty.textContent = diff;
  ui.points.textContent = String(pts);
  ui.question.textContent = q.question;

  ui.answers.innerHTML = "";
  q.answers.forEach((txt, i) => {
    const b = document.createElement("button");
    b.className = "answerBtn";
    b.textContent = txt;
    b.addEventListener("click", () => choose(i));
    ui.answers.appendChild(b);
  });

  setProgressUI();
  lockAnswers(false);
}

function markButtons(correctIndex, chosenIndex){
  const btns = [...ui.answers.querySelectorAll("button")];
  btns.forEach((b, i) => {
    if (i === correctIndex) b.classList.add("good");
    if (chosenIndex != null && i === chosenIndex && chosenIndex !== correctIndex) b.classList.add("bad");
  });
}

function showFeedback(ok, q){
  ui.feedback.classList.remove("hidden");
  ui.resultLine.textContent = ok ? "✅ Bonne réponse !" : "❌ Mauvaise réponse.";
  const letter = String.fromCharCode(65 + q.correctIndex);
  ui.explanation.textContent = `Réponse: ${letter}. ${q.answers[q.correctIndex]} — ${q.explanation}`;
}

function choose(chosenIndex){
  if (locked) return;
  playSound("click");

  const q = game[index];
  const ok = chosenIndex === q.correctIndex;

  lockAnswers(true);

  if (ok){
    score += getPoints(q);
    playSound("correct");
  } else {
    playSound("wrong");
  }

  markButtons(q.correctIndex, chosenIndex);
  showFeedback(ok, q);
  ui.score.textContent = String(score);
}

function next(){
  index += 1;
  const pct = Math.round(((index) / MAX_PER_GAME) * 100);
  ui.barFill.style.width = `${pct}%`;

  if (index >= game.length){
    finish();
    return;
  }
  render();
}

function finish(){
  lockAnswers(true);
  ui.answers.innerHTML = "";
  ui.feedback.classList.add("hidden");

  ui.question.textContent = `Terminé ✅ — Score: ${score} points`;
  ui.difficulty.textContent = "—";
  ui.points.textContent = "0";
  ui.progress.textContent = String(MAX_PER_GAME);
  ui.barFill.style.width = "100%";
}

function startGame(){
  score = 0;
  index = 0;

  // mélange global + sélection 20
  const shuffled = shuffle([...all]);
  game = shuffled.slice(0, Math.min(MAX_PER_GAME, shuffled.length));

  ui.score.textContent = "0";
  ui.barFill.style.width = "0%";
  render();
}

async function loadQuiz(){
  const res = await fetch(QUIZ_URL);
  if (!res.ok) throw new Error("Impossible de charger le quiz JSON.");
  const data = await res.json();

  if (!Array.isArray(data) || data.length < 20){
    throw new Error("Le JSON doit contenir au moins 20 questions.");
  }

  // validation minimale
  data.forEach((q, i) => {
    if (typeof q.question !== "string") throw new Error(`Q${i}: question invalide`);
    if (!Array.isArray(q.answers) || q.answers.length !== 4) throw new Error(`Q${i}: answers doit contenir 4 choix`);
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Q${i}: correctIndex invalide`);
    if (typeof q.explanation !== "string" || !q.explanation.trim()) throw new Error(`Q${i}: explication manquante`);
  });

  all = data;

  ui.progress.textContent = "0";
  ui.score.textContent = "0";
  ui.question.textContent = "Prêt. Clique “Démarrer”.";
}

ui.btnStart.addEventListener("click", () => {
  if (!all.length) return;
  startGame();
});
ui.btnRestart.addEventListener("click", () => {
  if (!all.length) return;
  startGame();
});
ui.btnNext.addEventListener("click", () => next());

loadQuiz().catch(err => {
  ui.question.textContent = "Erreur de chargement du quiz.";
  console.error(err);
});
