// Single grid cell
const Cell = ({ x, y, cellSize }) => (
    <div
        style={{
            gridRowStart: x + 1,
            gridColumnStart: y + 1,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            border: '1px solid black',
            backgroundColor: 'green',
        }}
    />
);

export default Cell;
