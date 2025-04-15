import React, { useState } from 'react';
import { GameGrid } from './GameGrid.jsx';
import { LobbyGrid } from './LobbyGrid.jsx';

export const App = () => {
    // Start in the lobby view by default.
    const [isLobby, setIsLobby] = useState(true);

    return (
        <>
            {isLobby ? (
                <LobbyGrid setInLobby={setIsLobby} />
            ) : (
                <GameGrid setInLobby={setIsLobby} />
            )}
        </>
    );
};

export default App;
