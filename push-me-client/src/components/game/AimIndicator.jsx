// game/AimIndicator.jsx
export const AimIndicator = ({
                                 aimDirection,
                                 indicatorDistance,
                                 cellSize,
                                 emoji = '👊',
                                 opacity = 0.3,
                                 fullCell = false,
                                 power = 3,
                                 maxPower = 6
                             }) => {
    // basePunch is where we start lerping (3).
    const basePower = maxPower / 2; // 3 for a 6-max
    // t: 0 at power=3, 1 at power=6
    const t = Math.min(Math.max((power - basePower) / (maxPower - basePower), 0), 1);

    // interpolate offset from indicatorDistance → cellSize as t goes 0→1
    const multiplier = fullCell
        ? cellSize
        : indicatorDistance + (cellSize - indicatorDistance) * t;

    // interpolate size from ½→1 of a cell (i.e. power/6)
    const fontSize = fullCell
        ? cellSize
        : cellSize * (power / maxPower);

    return (
        <div style={{
            position: 'absolute',
            top: `${aimDirection.dx * multiplier}px`,
            left: `${aimDirection.dy * multiplier}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${fontSize}px`,
            opacity,
            pointerEvents: 'none',
            zIndex: fullCell ? 11 : 5,
        }}>
            {emoji}
        </div>
    );
};
