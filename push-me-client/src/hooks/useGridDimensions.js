// src/hooks/useGridDimensions.js
import { useState, useEffect } from 'react';

/**
 * Calculates cellSize so that:
 *  - all columns (plus wall cols) always fit in (1 - controlFrac)*viewportWidth
 *  - exactly half the rows (plus top wall) fit in viewportHeight
 *
 * Updates on mount and on window resize.
 *
 * @param {number} gridSize
 * @param {number} controlFrac — fraction of viewport width reserved for controls (default 0.2)
 */
export function useGridDimensions(gridSize, controlFrac = 0.2) {
    // default until we calculate on mount
    const [dims, setDims] = useState({
        innerWidth: 0,
        innerHeight: 0,
        outerWidth: 0,
        outerHeight: 0,
        cellSize:   0
    });

    useEffect(() => {
        const calculate = () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;

            // Horizontal: need (gridSize + 2) cols to fit into (1-controlFrac)*vw
            const mapWidth = vw * (1 - controlFrac);
            const horizCell = mapWidth / (gridSize + 2);

            // Vertical: you want ceil(gridSize/2) rows + 1 wall row visible
            const halfRows = Math.ceil(gridSize / 2);
            const vertCell = vh / (halfRows + 1);

            // pick the smaller, floor it to avoid fractional px overflow
            const cellSize = Math.floor(Math.min(horizCell, vertCell));

            const innerW = gridSize * cellSize;
            const innerH = gridSize * cellSize;
            const outerW = innerW + 2 * cellSize;  // left + right walls
            const outerH = innerH + 2 * cellSize;  // top + bottom walls

            setDims({
                innerWidth:  innerW,
                innerHeight: innerH,
                outerWidth:  outerW,
                outerHeight: outerH,
                cellSize
            });
        };

        // calculate once on mount…
        calculate();
        // …and every time the window resizes
        window.addEventListener('resize', calculate);
        return () => window.removeEventListener('resize', calculate);
    }, [gridSize, controlFrac]);

    return dims;
}
