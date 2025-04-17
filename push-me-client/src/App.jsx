import React, {useState} from 'react';
import LobbyGrid from './LobbyGrid.jsx';
import GameGrid from './GameGrid.jsx';

export const App = () => {
    const [isLobby, setInLobby] = useState(true);
    const [playerId, setPlayerId] = useState(null);

    return (
        <>
            {isLobby ? (
                <LobbyGrid
                    setInLobby={setInLobby}
                    setPlayerId={setPlayerId}
                    playerId={playerId}
                />
            ) : (
                <GameGrid setInLobby={setInLobby} playerId={playerId}/>
            )}
        </>
    );
};

export default App;
