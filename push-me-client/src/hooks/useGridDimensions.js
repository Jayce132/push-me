// src/hooks/useGridDimensions.js
import { useState, useEffect } from 'react';

/**
 * @param {number} gridSize
 * @param {React.RefObject} containerRef  // the div we're filling
 * @param {boolean} widthOnly            // if true, ignore height when sizing cells
 */
export function useGridDimensions(gridSize, containerRef, widthOnly = false) {
    const [dims, setDims] = useState({
        innerWidth:  0,
        innerHeight: 0,
        outerWidth:  0,
        outerHeight: 0,
        cellSize:    0,
    });

    useEffect(() => {
        const calculate = () => {
            const vh = window.innerHeight;
            const cw = containerRef.current?.clientWidth ?? window.innerWidth;

            // Horizontal cell‐size
            const horizCell = cw / (gridSize + 2);

            let cellSize = horizCell;

            if (!widthOnly) {
                // Vertical cell‐size based on half‐rows + 1 wall
                const halfRows = Math.ceil(gridSize / 2);
                const vertCell = vh / (halfRows + 1);
                cellSize = Math.min(horizCell, vertCell);
            }

            cellSize = Math.floor(cellSize);

            const innerW = gridSize * cellSize;
            const innerH = gridSize * cellSize;
            const outerW = innerW + 2 * cellSize;
            const outerH = innerH + 2 * cellSize;

            setDims({
                innerWidth:  innerW,
                innerHeight: innerH,
                outerWidth:  outerW,
                outerHeight: outerH,
                cellSize,
            });
        };

        calculate();
        window.addEventListener('resize', calculate);
        return () => window.removeEventListener('resize', calculate);
    }, [gridSize, containerRef, widthOnly]);

    return dims;
}
