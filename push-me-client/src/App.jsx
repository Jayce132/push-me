import React, {useState} from 'react';
import {LobbyGrid} from './screens/LobbyGrid.jsx';
import {ArenaGrid} from './screens/ArenaGrid.jsx';
import useSession from './hooks/useSession.js';
import {CharacterSelector} from "./screens/CharacterSelector.jsx";

export const App = () => {
    // now stores { skin: string|null, score: number }
    const [user, setUser] = useSession('currentUser', {skin: null, score: 0});
    const [isLobby, setIsLobby] = useState(true);


    // If we don’t have a skin yet, show the selector
    if (!user.skin) {
        return (
            <CharacterSelector onSelect={chosenSkin => {
                // save chosen skin into session (score stays 0)
                setUser(prev => ({...prev, skin: chosenSkin, score: prev.score}));
            }}/>
        );
    }

    return (
        <>
            {isLobby ? (
                <LobbyGrid user={user} setUser={setUser} setInLobby={setIsLobby}/>
            ) : (
                <ArenaGrid user={user} setUser={setUser} setInLobby={setIsLobby}/>
            )}
        </>
    );
};

export default App;
