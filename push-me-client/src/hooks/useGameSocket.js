import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useGameSocket({
                                  url,
                                  user,
                                  setUser,
                                  setInLobby,
                                  initEvent,
                                  updateEvent,
                                  switchEvent
                              }) {
    const [socket, setSocket] = useState(null);
    const [gameState, setGameState] = useState({ players: {}, fires: [] });
    const [gridSize, setGridSize] = useState(20);

    useEffect(() => {
        const sock = io(url, {
            query: {
                skin: user.skin,
                score: user.score
            }
        });
        setSocket(sock);

        sock.on(initEvent, ({ gridSize }) => {
            setGridSize(gridSize);
        });

        sock.on(updateEvent, ({ players, fires }) => {
            setGameState({ players, fires });

            const me = players[sock.id];
            if (me?.skin) {
                setUser(prev => ({
                    ...prev,
                    skin: me.skin,
                    score: me.score ?? prev.score
                }));
            }
        });

        sock.on(switchEvent, ({ skin, score }) => {
            setUser({ skin, score });
            setInLobby(switchEvent === 'switchToLobby'); // true for arena, false for lobby
        });

        sock.on('noSkinAvailable', ({ message }) => alert(message));

        return () => sock.disconnect();
    }, [url, user.skin, user.score]);

    return { socket, gameState, gridSize };
}
