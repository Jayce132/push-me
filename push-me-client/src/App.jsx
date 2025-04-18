import React, { useState } from 'react';
import { LobbyGrid } from './grids/LobbyGrid.jsx';
import { ArenaGrid } from './grids/ArenaGrid.jsx';
import useSession from './hooks/useSession.js';

export const App = () => {
    // now stores { skin: string|null, score: number }
    const [user, setUser] = useSession('currentUser', { skin: null, score: 0 });
    const [isLobby, setIsLobby] = useState(true);

    return (
        <>
            {isLobby ? (
                <LobbyGrid user={user} setUser={setUser} setInLobby={setIsLobby} />
            ) : (
                <ArenaGrid user={user} setUser={setUser} setInLobby={setIsLobby} />
            )}
        </>
    );
};

export default App;
