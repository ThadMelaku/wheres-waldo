
import express from "express";

const app = express();
const PORT = 3001;

app.use(express.json());

const characters = {
  Waldo: { x: 0.467, y: 0.608 },
  Wizard: { x: 0.030, y: 0.291 },
  Wilma: { x: 0.967, y: 0.468 },
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/validate-guess", (req, res) => {
  const { character, x, y } = req.body ?? {};

  if (
    typeof character !== "string" ||
    !Object.hasOwn(characters, character) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 || x > 1 || y < 0 || y > 1
  ) {
    return res.status(400).json({ error: "Invalid guess" });
  }

  const position = characters[character];

  const tolerance = 0.035;

  const correct =
    Math.abs(x - position.x) <= tolerance &&
    Math.abs(y - position.y) <= tolerance;

  res.json({ correct, character });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
