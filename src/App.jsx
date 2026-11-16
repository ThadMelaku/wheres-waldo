import { useState } from "react";
import "./App.css";

const characters = ["Waldo", "Wizard", "Wilma"];

function App() {
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState("");

  function handleImageClick(e) {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTarget({ x, y });
  }

  function handleCharacterSelect(character) {
    setMessage(`You selected ${character}!`);
    setTarget(null);
  }

  return (
    <main className="app" onClick={() => setTarget(null)}>
      <h1>Where's Waldo?</h1>
      <p>Find Waldo, Wizard, and Wilma!</p>

      <div className="image-container" onClick={handleImageClick}>
        <img src="/scene.jpg" alt="Hidden character puzzle" />

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
              {characters.map((character) => (
                <button
                  key={character}
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
    </main>
  );
}

export default App;