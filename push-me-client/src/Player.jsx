import React, {useEffect, useState} from 'react';

export const Player = ({position, onMove, onPunch, cellSize, isCurrentPlayer}) => {
    // Handle keyboard inputs

    useEffect(() => {
        console.log("Event Listener Added");
        if (isCurrentPlayer) {
            const handleKeyPress = (e) => {
                console.log(e);
                switch (e.key) {
                    case 'w':
                        onMove('up');
                        break;
                    case 's':
                        onMove('down');
                        break;
                    case 'a':
                        onMove('left');
                        break;
                    case 'd':
                        onMove('right');
                        break;
                    case ' ':
                        e.preventDefault(); // Prevents the default action of the space key (scrolling down)
                        onPunch();
                        break;
                    default:
                        break;
                }
            };

            window.addEventListener('keydown', handleKeyPress);
            return () => window.removeEventListener('keydown', handleKeyPress);
        }
    }, [onMove, onPunch, isCurrentPlayer]);


    console.log("Player component rendered");

    return (
        <div
            style={{
                gridRowStart: position.x + 1,
                gridColumnStart: position.y + 1,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${cellSize}px`,
                zIndex: 10,
            }}
        >
      <span role="img" aria-label="player">
        😭
      </span>
        </div>
    );
};
