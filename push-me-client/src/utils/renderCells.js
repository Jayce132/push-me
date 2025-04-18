function renderCells(gridSize, cellSize) {
    const cells = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            cells.push(<Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />);
        }
    }
    return cells;
}
