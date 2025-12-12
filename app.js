const QUIZ_URL = "./assets/quiz_islam_200.json"; // adapte si ton JSON est ailleurs
const TIME_PER_QUESTION = 10;
const DANGER_AT = 3;

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
  time: el("time"),
  barFill: el("barFill"),
  question: el("question"),
  answers: el("answers"),
  feedback: el("feedback"),
  resultLine: el("resultLine"),
  explanation: el("explanation"),
  btnStart: el("btnStart"),
  btnRestart: el("btnRestart"),
  btnNext: el("btnNext"),
  toggleSound: el("toggleSound"),
  btnTheme: el("btnTheme"),
};

const root = document.documentElement;

let quiz = [];
let order = [];
let index = 0;
let score = 0;
let locked = true;

let timer = null;
let timeLeft = TIME_PER_QUESTION;

/* ===========================
   THEME
   =========================== */
function applyTheme(theme) {
  root.dataset.theme = theme; // "dark" | "light"
  localStorage.setItem("theme", theme);
  if (ui.btnTheme) ui.btnTheme.textContent = theme === "light" ? "☀️ Clair" : "🌙 Sombre";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  applyTheme(saved === "light" ? "light" : "dark");
  if (ui.btnTheme) {
    ui.btnTheme.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      applyTheme(next);
    });
  }
}

/* ===========================
   UTILS
   =========================== */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function playSound(key) {
  if (!ui.toggleSound?.checked) return;
  const src = SOUNDS[key];
  if (!src) return;
  const a = new Audio(src);
  a.volume = 0.6;
  a.play().catch(() => {});
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function setDangerUI(isDanger) {
  const timerBox = document.querySelector(".timerBox");
  const timerValue = document.querySelector(".timerValue");
  timerBox?.classList.toggle("danger", isDanger);
  timerValue?.classList.toggle("danger", isDanger);
  ui.barFill?.classList.toggle("danger", isDanger);
}

function setTimerUI() {
  ui.time.textContent = String(timeLeft);
  const ratio = Math.max(0, Math.min(1, timeLeft / TIME_PER_QUESTION));
  ui.barFill.style.width = `${ratio * 100}%`;

  setDangerUI(timeLeft <= DANGER_AT);
}

function startTimer() {
  stopTimer();
  timeLeft = TIME_PER_QUESTION;
  setTimerUI();

  timer = setInterval(() => {
    timeLeft -= 1;
    setTimerUI();
    if (timeLeft <= 0) {
      stopTimer();
      onTimeout();
    }
  }, 1000);
}

function resetFeedback() {
  ui.feedback.classList.add("hidden");
  ui.resultLine.textContent = "";
  ui.explanation.textContent = "";
}

function lockAnswers(lock) {
  locked = lock;
  const btns = ui.answers.querySelectorAll("button");
  btns.forEach((b) => {
    b.classList.toggle("disabled", lock);
    b.disabled = lock;
  });
}

function clearAnim(btn) {
  btn.classList.remove("pop", "shake");
  // force reflow pour rejouer l'anim
  void btn.offsetWidth;
}

/* ===========================
   RENDER
   =========================== */
function render() {
  resetFeedback();

  const q = quiz[order[index]];
  ui.question.textContent = q.question;

  ui.answers.innerHTML = "";
  q.answers.forEach((txt, i) => {
    const b = document.createElement("button");
    b.className = "answerBtn";
    b.textContent = `${String.fromCharCode(65 + i)}. ${txt}`;
    b.addEventListener("click", () => choose(i, b));
    ui.answers.appendChild(b);
  });

  ui.progress.textContent = `${index + 1}/${quiz.length}`;
  ui.score.textContent = `Score: ${score}`;

  lockAnswers(false);
  startTimer();
}

function showFeedback(isCorrect, correctIndex, explanation, reason = "") {
  ui.feedback.classList.remove("hidden");
  ui.resultLine.textContent = isCorrect
    ? "✅ Bonne réponse !"
    : `❌ Mauvaise réponse. ${reason}`.trim();

  const letter = String.fromCharCode(65 + correctIndex);
  ui.explanation.textContent = `Réponse: ${letter}. ${quiz[order[index]].answers[correctIndex]} — ${explanation}`;
}

function markButtons(correctIndex, chosenIndex) {
  const btns = [...ui.answers.querySelectorAll("button")];
  btns.forEach((b, i) => {
    if (i === correctIndex) b.classList.add("good");
    if (chosenIndex != null && i === chosenIndex && chosenIndex !== correctIndex) b.classList.add("bad");
  });
}

/* ===========================
   GAME LOGIC
   =========================== */
function choose(chosenIndex, chosenBtn) {
  if (locked) return;

  playSound("click");
  stopTimer();
  lockAnswers(true);

  const q = quiz[order[index]];
  const correctIndex = q.correctIndex;
  const ok = chosenIndex === correctIndex;

  // anim
  if (chosenBtn) {
    clearAnim(chosenBtn);
    chosenBtn.classList.add(ok ? "pop" : "shake");
  }

  if (ok) {
    score += 1;
    playSound("correct");
  } else {
    playSound("wrong");
  }

  markButtons(correctIndex, chosenIndex);
  showFeedback(ok, correctIndex, q.explanation);

  ui.score.textContent = `Score: ${score}`;
}

function onTimeout() {
  if (locked) return;
  lockAnswers(true);

  const q = quiz[order[index]];
  markButtons(q.correctIndex, null);

  playSound("timeout");
  showFeedback(false, q.correctIndex, q.explanation, "(temps écoulé)");
}

function next() {
  stopTimer();
  setDangerUI(false);

  index += 1;
  if (index >= quiz.length) {
    finish();
    return;
  }
  render();
}

function finish() {
  stopTimer();
  setDangerUI(false);

  lockAnswers(true);
  ui.answers.innerHTML = "";
  ui.feedback.classList.add("hidden");
  ui.question.textContent = `Terminé ✅ — Score final: ${score}/${quiz.length}`;
  ui.progress.textContent = `${quiz.length}/${quiz.length}`;
}

function restart() {
  stopTimer();
  setDangerUI(false);

  score = 0;
  index = 0;
  order = shuffle([...Array(quiz.length).keys()]);
  render();
}

/* ===========================
   LOAD QUIZ
   =========================== */
async function loadQuiz() {
  const res = await fetch(QUIZ_URL);
  if (!res.ok) throw new Error("Impossible de charger le quiz JSON.");
  const data = await res.json();

  if (!Array.isArray(data) || data.length !== 200) {
    throw new Error("Le JSON doit être un tableau de 200 questions.");
  }

  data.forEach((q, i) => {
    if (typeof q.id !== "number") throw new Error(`Question ${i}: id invalide`);
    if (typeof q.question !== "string") throw new Error(`Question ${i}: question invalide`);
    if (!Array.isArray(q.answers) || q.answers.length !== 4) throw new Error(`Question ${i}: answers doit contenir 4 choix`);
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Question ${i}: correctIndex invalide`);
    if (typeof q.explanation !== "string" || !q.explanation.trim()) throw new Error(`Question ${i}: explication manquante`);
  });

  quiz = data;
  order = shuffle([...Array(quiz.length).keys()]);
  ui.progress.textContent = `0/${quiz.length}`;
  ui.score.textContent = "Score: 0";
  ui.question.textContent = "Prêt. Clique “Démarrer”.";
}

/* ===========================
   EVENTS
   =========================== */
ui.btnStart.addEventListener("click", () => {
  if (!quiz.length) return;
  restart();
});

ui.btnRestart.addEventListener("click", () => {
  if (!quiz.length) return;
  restart();
});

ui.btnNext.addEventListener("click", () => next());

initTheme();

loadQuiz().catch((err) => {
  ui.question.textContent = "Erreur de chargement du quiz.";
  ui.answers.innerHTML = "";
  ui.feedback.classList.add("hidden");
  console.error(err);
});
