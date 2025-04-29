// components/Player.jsx
import React from 'react';
import {usePlayerControls} from '../hooks/usePlayerControls.js';
import {AimIndicator} from './AimIndicator.jsx';
import {PunchIndicator} from './PunchIndicator.jsx';

export const Player = ({
                           position,
                           onMove,
                           onPunch,
                           cellSize,
                           isCurrentPlayer,
                           skin,
                           isPunching,               // server‐sent
                           punchDirection,           // server‐sent
                           isKnockedBack,            // server‐sent
                           lastDirection: serverLastDirection,
                           nextPunchPower            // server‐sent, 3–6
                       }) => {
    const {
        aimDirection,
        indicatorDistance,
        shouldShowPunch,        // local punch
        localPunchDirection     // captured local direction
    } = usePlayerControls({
        isCurrentPlayer,
        onMove,
        onPunch,
        serverLastDirection,
        cellSize
    });

    // decide which direction & which source
    const directionToRender = shouldShowPunch
        ? localPunchDirection
        : (isPunching ? punchDirection : null);

    // only show the aim‐indicator for the current player
    const showAim = isCurrentPlayer && !directionToRender;
    const showPunch = directionToRender && (directionToRender.dx !== 0 || directionToRender.dy !== 0);

    const topPx = position.x * cellSize;
    const leftPx = position.y * cellSize;

    return (
        <div style={{
            position: 'absolute',
            top: `${topPx}px`,
            left: `${leftPx}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            transition: 'top 0.1s ease, left 0.1s ease, transform 0.1s ease',
            transform: isKnockedBack ? 'scale(3)' : 'scale(1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${cellSize}px`,
            zIndex: 10,
        }}>
            {/* 1) small/faint aim indicator */}
            {showAim && (
                <AimIndicator
                    aimDirection={aimDirection}
                    indicatorDistance={indicatorDistance}
                    cellSize={cellSize}
                    emoji="👊"
                    opacity={0.3}
                    power={nextPunchPower}
                />
            )}

            {/* 2) player skin */}
            <span role="img" aria-label="player">{skin}</span>

            {/* 3) full-cell punch indicator strictly in the adjacent cell */}
            {showPunch && (
                <PunchIndicator
                    direction={directionToRender}
                    cellSize={cellSize}
                    emoji="👊"
                />
            )}
        </div>
    );
};
