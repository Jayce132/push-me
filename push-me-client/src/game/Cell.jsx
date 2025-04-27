// Single grid cell
const Cell = ({ x, y, cellSize }) => (
    <div
        style={{
            gridRowStart: x + 1,
            gridColumnStart: y + 1,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            border: '1px solid #242424',
            backgroundColor: '#1a1a1a',
        }}
    />
);

export default Cell;
