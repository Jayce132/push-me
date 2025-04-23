import React from 'react';

/**
 * Renders a full‐cell punch emoji in the adjacent cell.
 * @param {{dx:number,dy:number}} direction  – unit vector {dx,dy}
 * @param {number} cellSize                  – size of one cell in px
 * @param {string} emoji                     – emoji to render (default 👊)
 */
export const PunchIndicator = ({
                                   direction,
                                   cellSize,
                                   emoji = '👊'
                               }) => (
    <div
        style={{
            position:      'absolute',
            top:           `${direction.dx * cellSize}px`,
            left:          `${direction.dy * cellSize}px`,
            width:         `${cellSize}px`,
            height:        `${cellSize}px`,
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            fontSize:      `${cellSize}px`,
            pointerEvents: 'none',
            zIndex:        11,
        }}
    >
        {emoji}
    </div>
);
