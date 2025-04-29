// Single grid cell
const Cell = ({ x, y, cellSize }) => (
    <div
        style={{
            gridRowStart: x + 1,
            gridColumnStart: y + 1,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            backgroundImage: `url(https://www.filterforge.com/filters/10270-v3.jpg)`,
            backgroundSize: '200%',
        }}
    />
);

export default Cell;
