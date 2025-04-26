import { useMemo } from 'react';

/**
 * Two-half camera: lock to the first or second half of the grid.
 *
 * @param {{ x: number, y: number }} position   — player cell coords
 * @param {number} cellSize                     — px per cell
 * @param {number} outerWidth                   — total map width (walls + grid) in px
 * @param {number} outerHeight                  — total map height in px
 * @param {number} gridSize                     — number of cells per side
 * @param {string} transition                   — CSS transition for camera moves
 */
export function useCamera({
                              position,
                              cellSize,
                              outerWidth,
                              outerHeight,
                              gridSize,
                              transition = 'transform 0.5s ease'
                          }) {
    // viewport = full map width, full viewport height
    const viewportW = outerWidth;
    const viewportH = window.innerHeight;

    // halfway index (0-based)
    const half = Math.floor(gridSize / 2);

    // decide which half we’re in
    const halfY = useMemo(() => (position.x > half ? 1 : 0), [position.x, half]);
    const halfX = useMemo(() => (position.y > half ? 1 : 0), [position.y, half]);

    // offset is either 0 or (map dimension – viewport dimension)
    const offsetY = useMemo(
        () => halfY * Math.max(0, outerHeight - viewportH),
        [halfY, outerHeight, viewportH]
    );
    const offsetX = useMemo(
        () => halfX * Math.max(0, outerWidth - viewportW),
        [halfX, outerWidth, viewportW]
    );

    return { offsetX, offsetY, transition };
}
