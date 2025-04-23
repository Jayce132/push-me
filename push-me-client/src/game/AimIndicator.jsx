import React from 'react';

/**
 * Draws a faint or full-cell punch icon at aimDirection.
 */
export const AimIndicator = ({
                                 aimDirection,
                                 indicatorDistance,
                                 cellSize,
                                 emoji = '👊',
                                 opacity = 0.3,
                                 fullCell = false
                             }) => {
    // offset multiplier: full cell or just the faint offset
    const multiplier = fullCell ? cellSize : indicatorDistance;

    // font size: full cell for punch overlay, half cell for aim indicator
    const fontSize = fullCell ? cellSize : cellSize * 0.5;

    return (
        <div
            style={{
                position:      'absolute',
                top:           `${aimDirection.dx * multiplier}px`,
                left:          `${aimDirection.dy * multiplier}px`,
                width:         `${cellSize}px`,
                height:        `${cellSize}px`,
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                fontSize:      `${fontSize}px`,
                opacity,
                pointerEvents: 'none',
                zIndex:        fullCell ? 11 : 5,
            }}
        >
            {emoji}
        </div>
    );
};
