export const PlayerList = ({ players, currentUser, currentSocketId }) => {
    const sorted = Object.entries(players).sort(([, a], [, b]) => (b.score ?? 0) - (a.score ?? 0));

    return (
        <div className="player-list">
            <h3>Connected Players</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {sorted.map(([pid, p]) => {
                    const isYou = p.skin === currentUser.skin;
                    const emoji = p.isAlive === false ? '👻' : p.skin;
                    const status = p.isAlive === false ? '(ghost)' : '';
                    return (
                        <li key={pid} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: '1.5rem', marginRight: 8 }}>{emoji}</span>
                            <span>
                                {isYou && '(you) '}
                                {status} Score: {p.score ?? 0}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
