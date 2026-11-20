
import express from "express";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = 3001;

app.use(express.json());

const db = new DatabaseSync(
  fileURLToPath(new URL("./waldo.sqlite", import.meta.url))
);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    found_json TEXT NOT NULL DEFAULT '[]',
    player_name TEXT
  )
`);

const characters = {
  Waldo: { x: 0.467, y: 0.608 },
  Wizard: { x: 0.030, y: 0.291 },
  Wilma: { x: 0.967, y: 0.468 },
};

const tolerance = 0.035;

const getGame = db.prepare(
  "SELECT * FROM games WHERE id = ?"
);

const getTopScores = db.prepare(`
  SELECT
    player_name AS name,
    finished_at - started_at AS elapsedMs
  FROM games
  WHERE player_name IS NOT NULL
  ORDER BY elapsedMs ASC, finished_at ASC
  LIMIT 10
`);

function qualifiesForLeaderboard(elapsedMs) {
  const scores = getTopScores.all();

  return (
    scores.length < 10 ||
    elapsedMs < scores[scores.length - 1].elapsedMs
  );
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start a new game
app.post("/api/games", (req, res) => {
  const gameId = randomUUID();
  const startedAt = Date.now();

  db.prepare(
    "INSERT INTO games (id, started_at) VALUES (?, ?)"
  ).run(gameId, startedAt);

  res.status(201).json({ gameId });
});

// Validate a guess for a specific game
app.post("/api/games/:gameId/guess", (req, res) => {
  const game = getGame.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  if (game.finished_at !== null) {
    return res.status(409).json({ error: "Game already finished" });
  }

  const { character, x, y } = req.body ?? {};

  if (
    typeof character !== "string" ||
    !Object.hasOwn(characters, character) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 || x > 1 ||
    y < 0 || y > 1
  ) {
    return res.status(400).json({ error: "Invalid guess" });
  }

  const found = JSON.parse(game.found_json);

  if (found.includes(character)) {
    return res.status(409).json({
      error: "Character already found",
    });
  }

  const position = characters[character];

  const correct =
    Math.abs(x - position.x) <= tolerance &&
    Math.abs(y - position.y) <= tolerance;

  if (!correct) {
    return res.json({ correct: false });
  }

  found.push(character);

  const finished = found.length === Object.keys(characters).length;
  const finishedAt = finished ? Date.now() : null;

  db.prepare(`
    UPDATE games
    SET found_json = ?, finished_at = ?
    WHERE id = ?
  `).run(JSON.stringify(found), finishedAt, game.id);

  const result = { correct: true, character, finished };

  if (finished) {
    const elapsedMs = finishedAt - game.started_at;

    result.elapsedMs = elapsedMs;
    result.qualifies = qualifiesForLeaderboard(elapsedMs);
  }

  res.json(result);
});

// Retrieve leaderboard
app.get("/api/scores", (req, res) => {
  res.json(getTopScores.all());
});

// Submit score
app.post("/api/games/:gameId/score", (req, res) => {
  const game = getGame.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  if (game.finished_at === null) {
    return res.status(403).json({
      error: "Finish the game before submitting a score",
    });
  }

  if (game.player_name !== null) {
    return res.status(409).json({
      error: "Score already submitted",
    });
  }

  const { name } = req.body ?? {};

  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 30
  ) {
    return res.status(400).json({ error: "Invalid name" });
  }

  const elapsedMs = game.finished_at - game.started_at;

  if (!qualifiesForLeaderboard(elapsedMs)) {
    return res.status(403).json({
      error: "Score no longer qualifies for the leaderboard",
    });
  }

  db.prepare(`
    UPDATE games
    SET player_name = ?
    WHERE id = ? AND player_name IS NULL
  `).run(name.trim(), game.id);

  res.status(201).json({ saved: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

