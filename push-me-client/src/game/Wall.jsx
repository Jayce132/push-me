import React from 'react';

export const Wall = ({ gridSize, cellSize }) => {
    const totalCols = gridSize + 2;
    const totalRows = gridSize + 2;
    const wallCellStyle = {
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${cellSize}px`,
        backgroundColor: 'green'
    };

    const cells = [];
    for (let row = 0; row < totalRows; row++) {
        for (let col = 0; col < totalCols; col++) {
            if (row === 0 || row === totalRows - 1 || col === 0 || col === totalCols - 1) {
                cells.push(
                    <div key={`${row}-${col}`} style={wallCellStyle}>
                        <span role="img" aria-label="wall">🪨</span>
                    </div>
                );
            } else {
                // Render an empty placeholder for inner cells (these will be overlaid with the game grid)
                cells.push(
                    <div key={`${row}-${col}`} style={{ width: `${cellSize}px`, height: `${cellSize}px` }}></div>
                );
            }
        }
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${totalCols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${totalRows}, ${cellSize}px)`,
            }}
        >
            {cells}
        </div>
    );
};
