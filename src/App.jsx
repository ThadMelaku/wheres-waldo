import { useEffect, useRef, useState } from "react";
import "./App.css";

const characters = ["Waldo", "Wizard", "Wilma"];
const characterImages = {
  Waldo: "/characters/waldo.png",
  Wizard: "/characters/wizard.png",
  Wilma: "/characters/wilma.png",
};

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function getScores() {
  const response = await fetch("/api/scores");

  if (!response.ok) {
    throw new Error("Failed to load scores");
  }

  return response.json();
}

function App() {
  const [gameId, setGameId] = useState(null);
  const [target, setTarget] = useState(null);
  const [foundCharacters, setFoundCharacters] = useState([]);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [finished, setFinished] = useState(false);
  const [qualifies, setQualifies] = useState(false);

  const [scores, setScores] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoreError, setScoreError] = useState("");

  const timerStartRef = useRef(null);
  const startingRef = useRef(false);

  const remainingCharacters = characters.filter(
    (character) =>
      !foundCharacters.some(
        (found) => found.character === character
      )
  );

  // Load leaderboard
  useEffect(() => {
    getScores().then(setScores).catch(console.error);
  }, []);

  // Display timer (official time is calculated by Express)
  useEffect(() => {
    if (!gameId || finished) return;

    const interval = setInterval(() => {
      setElapsedMs(performance.now() - timerStartRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [gameId, finished]);

  // Start game when image loads
  async function handleImageLoad() {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      const response = await fetch("/api/games", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start game");
      }

      const data = await response.json();

      timerStartRef.current = performance.now();
      setGameId(data.gameId);
      setMessage("");
    } catch (error) {
      console.error(error);
      startingRef.current = false;
      setMessage("Could not start game. Please refresh.");
    }
  }

  function handleImageClick(e) {
    e.stopPropagation();

    if (!gameId || isChecking || finished) return;

    const rect = e.currentTarget.getBoundingClientRect();

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Determine whether dropdown should open upward
    const menuHeight = remainingCharacters.length * 44 + 12;

    const roomBelow =
      Math.min(rect.bottom, window.innerHeight) - e.clientY;

    const roomAbove =
      e.clientY - Math.max(rect.top, 0);

    const menuAbove =
      roomBelow < menuHeight + 35 &&
      roomAbove > roomBelow;

    setTarget({ x, y, menuAbove });
  }

  // Validate character selection with Express
  async function handleCharacterSelect(character) {
    if (!gameId || !target || isChecking || finished) return;

    const guess = {
      x: target.x,
      y: target.y,
    };

    setTarget(null);
    setIsChecking(true);

    try {
      const response = await fetch(
        `/api/games/${gameId}/guess`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character,
            ...guess,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to validate guess");
      }

      const data = await response.json();

      if (data.correct) {
        setFoundCharacters((prev) => [
          ...prev,
          { character, ...guess },
        ]);

        setMessage(`Correct! You found ${character}!`);

        if (data.finished) {
          setFinished(true);
          setElapsedMs(data.elapsedMs);
          setQualifies(data.qualifies);
          setMessage("");
        }
      } else {
        setMessage("Incorrect! Try again.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  // Submit leaderboard score
  async function handleScoreSubmit(e) {
    e.preventDefault();

    if (saving || submitted) return;

    setSaving(true);
    setScoreError("");

    try {
      const response = await fetch(
        `/api/games/${gameId}/score`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: playerName }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save score");
      }

      setSubmitted(true);

      try {
        setScores(await getScores());
      } catch (error) {
        console.error("Could not refresh leaderboard:", error);
      }
    } catch (error) {
      setScoreError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app" onClick={() => setTarget(null)}>
      

      <div className="game-layout">
        {/* Left side: Puzzle image */}
        <section className="puzzle-panel">
          <h1>Where's Waldo?</h1>
          <div
            className="image-container"
            onClick={handleImageClick}
          >
            <img
              src="/scene.jpg"
              alt="Hidden character puzzle"
              onLoad={handleImageLoad}
            />

            {/* Markers for found characters */}
            {foundCharacters.map((found) => (
              <div
                key={found.character}
                className="found-marker"
                style={{
                  left: `${found.x * 100}%`,
                  top: `${found.y * 100}%`,
                }}
                title={found.character}
              >
                ✓
              </div>
            ))}

            {/* Targeting box and dropdown */}
            {target && (
              <>
                <div
                  className="target-box"
                  style={{
                    left: `${target.x * 100}%`,
                    top: `${target.y * 100}%`,
                  }}
                />

                <div
                  className={`character-menu ${
                    target.menuAbove ? "menu-above" : ""
                  }`}
                  style={{
                    left: `clamp(90px, ${target.x * 100}%, calc(100% - 90px))`,
                    top: `${target.y * 100}%`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {remainingCharacters.map((character) => (
                    <button
                      key={character}
                      disabled={isChecking}
                      onClick={() =>
                        handleCharacterSelect(character)
                      }
                    >
                      {character}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        
        </section>

        {/* Right Side: Sticky sidebar */}
        <aside className="game-sidebar">
          {/* Character reference images */}
          <h2>Find These Characters</h2>

          <div className="character-guide">
            {characters.map((character) => {
              const isFound = foundCharacters.some(
                (found) => found.character === character
              );

              return (
                <div
                  key={character}
                  className={`character-card ${
                    isFound ? "found" : ""
                  }`}
                >
                  <img
                    src={characterImages[character]}
                    alt={character}
                  />
                  <span>
                    {character} {isFound && "✓"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Timer and progress */}
          <div className="game-info">
            <p>
              {finished ? "Final time" : "Time"}:{" "}
              {gameId ? formatTime(elapsedMs) : "Starting..."}
            </p>
            <p>
              Found: {foundCharacters.length} / {characters.length}
            </p>
          </div>
          {finished && (
            <div className="completion-message">
              {qualifies ? (
                <>
                  <h3>🎉 Congratulations!</h3>
                  <p>You made the top 10!</p>
                </>
              ) : (
                <p>You found everyone!</p>
              )}
              
            </div>
          )}

          {/* Leaderboard */}
          <section className="leaderboard">
            <h2>Leaderboard — Top 10</h2>

            {scores.length === 0 ? (
              <p>No scores yet. Be the first!</p>
            ) : (
              <ol>
                {scores.map((score, index) => (
                  <li key={`${index}-${score.name}`}>
                    <span>{score.name}</span>
                    <span>{formatTime(score.elapsedMs)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {/* Score submission popup */}
      {finished && qualifies && !submitted && (
        <div className="score-overlay">
          <form
            className="score-modal"
            onSubmit={handleScoreSubmit}
          >
            <h2>You made the top 10!</h2>
            <p>Your time: {formatTime(elapsedMs)}</p>

            <label htmlFor="player-name">Your name</label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) =>
                setPlayerName(e.target.value)
              }
              maxLength={30}
              required
              autoFocus
            />

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Submit score"}
            </button>

            {scoreError && (
              <p role="alert">{scoreError}</p>
            )}
          </form>
        </div>
      )}
    </main>
  );
}

export default App;

