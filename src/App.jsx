
import { useState } from "react";
import "./App.css";

const characters = ["Waldo", "Wizard", "Wilma"];

function App() {
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [foundCharacters, setFoundCharacters] = useState([]);

  const remainingCharacters = characters.filter(
    (character) =>
      !foundCharacters.some((found) => found.character === character)
  );

  const gameComplete = remainingCharacters.length === 0;

  function handleImageClick(e) {
    e.stopPropagation();

    if (isChecking || gameComplete) return;

    const rect = e.currentTarget.getBoundingClientRect();

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTarget({ x, y });
  }

  async function handleCharacterSelect(character) {
    if (!target || isChecking) return;

    const guess = { ...target };

    setIsChecking(true);
    setTarget(null);

    try {
      const response = await fetch("/api/validate-guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character,
          x: guess.x,
          y: guess.y,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to validate guess");
      }

      const data = await response.json();

      if (data.correct) {
        setFoundCharacters((prev) => {
          if (prev.some((found) => found.character === character)) {
            return prev;
          }

          return [...prev, { character, ...guess }];
        });

        setMessage(`Correct! You found ${character}!`);
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

  return (
    <main className="app" onClick={() => setTarget(null)}>
      <h1>Where's Waldo?</h1>

      <p>
        Found: {foundCharacters.length} / {characters.length}
      </p>

      <div className="image-container" onClick={handleImageClick}>
        <img src="/scene.jpg" alt="Hidden character puzzle" />

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
              className="character-menu"
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
                  onClick={() => handleCharacterSelect(character)}
                >
                  {character}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p role="status">{message}</p>

      {gameComplete && <h2>Congratulations! You found everyone!</h2>}
    </main>
  );
}

export default App;
