// node scripts/validate-quiz.js
import fs from "node:fs";

const path = "assets/quiz_islam_200.json";
const raw = fs.readFileSync(path, "utf8");
const data = JSON.parse(raw);

function fail(msg) {
  console.error("❌", msg);
  process.exit(1);
}

if (!Array.isArray(data)) fail("Le JSON doit être un tableau.");
if (data.length !== 200) fail(`Il faut 200 questions, trouvé: ${data.length}`);

const ids = new Set();
data.forEach((q, i) => {
  if (typeof q.id !== "number") fail(`Index ${i}: id invalide`);
  if (ids.has(q.id)) fail(`id dupliqué: ${q.id}`);
  ids.add(q.id);

  if (typeof q.question !== "string" || !q.question.trim()) fail(`id ${q.id}: question vide`);
  if (!Array.isArray(q.answers) || q.answers.length !== 4) fail(`id ${q.id}: answers doit contenir 4 choix`);
  if (q.answers.some(a => typeof a !== "string" || !a.trim())) fail(`id ${q.id}: answer vide`);
  if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) fail(`id ${q.id}: correctIndex invalide`);
  if (typeof q.explanation !== "string" || !q.explanation.trim()) fail(`id ${q.id}: explication manquante`);
});

console.log("✅ OK: 200 questions valides, ids uniques, explications présentes.");
