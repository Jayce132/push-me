export function useGridDimensions(gridSize, cellSize = 32) {
    const innerWidth = gridSize * cellSize;
    const innerHeight = gridSize * cellSize;
    const outerWidth = innerWidth + 2 * cellSize;
    const outerHeight = innerHeight + 2 * cellSize;
    return { innerWidth, innerHeight, outerWidth, outerHeight, cellSize };
}
