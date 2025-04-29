// components/Ghost.jsx
import React from 'react';
import { usePlayerControls } from '../hooks/usePlayerControls.js';
import { AimIndicator }      from './AimIndicator.jsx';
import { PunchIndicator }    from './PunchIndicator.jsx';

export const Ghost = ({
                          position,
                          onMove,
                          onPunch,
                          cellSize,
                          isCurrentPlayer,
                          isKnockedBack,            // server‐sent flag
                          lastDirection: serverLastDirection
                      }) => {
    // Pull in aim/punch state
    const {
        aimDirection,          // where to point the faint icon
        indicatorDistance,
        shouldShowPunch,       // true while holding space locally
        localPunchDirection    // captured local direction at space press
    } = usePlayerControls({
        isCurrentPlayer,
        onMove,
        onPunch,
        serverLastDirection,
        cellSize
    });

    // Decide what to render
    // only show the aim‐indicator for the current ghost
    const showAim   = isCurrentPlayer && !shouldShowPunch;
    const showPunch = shouldShowPunch && localPunchDirection && (
        localPunchDirection.dx !== 0 || localPunchDirection.dy !== 0
    );

    const topPx  = position.x * cellSize;
    const leftPx = position.y * cellSize;

    return (
        <div style={{
            position:   'absolute',
            top:        `${topPx}px`,
            left:       `${leftPx}px`,
            width:      `${cellSize}px`,
            height:     `${cellSize}px`,
            transition: 'top 0.1s ease, left 0.1s ease, transform 0.1s ease',
            transform:  isKnockedBack ? 'scale(3)' : 'scale(1)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            fontSize:      `${cellSize}px`,
            zIndex:        10,
        }}>
            {/* 1) faint ghost‐aim indicator */}
            {showAim && (
                <AimIndicator
                    aimDirection={aimDirection}
                    indicatorDistance={indicatorDistance}
                    cellSize={cellSize}
                    emoji="💧"
                    opacity={0.3}
                />
            )}

            {/* 2) ghost icon */}
            <span role="img" aria-label="ghost">👻</span>

            {/* 3) full‐cell ghost punch */}
            {showPunch && (
                <PunchIndicator
                    direction={localPunchDirection}
                    cellSize={cellSize}
                    emoji="💧"
                />
            )}
        </div>
    );
};

