const grid = document.querySelector('#game-grid');
const sizeSlider = document.querySelector('#base-size');
const sizeLabel = document.querySelector('#size-label');
const tileCount = document.querySelector('#tile-count');
const status = document.querySelector('#status');

function renderGrid(size) {
  const tiles = size * size;
  grid.replaceChildren();
  grid.style.gridTemplateColumns = `repeat(${size}, var(--tile))`;
  grid.style.gridTemplateRows = `repeat(${size}, var(--tile))`;
  grid.setAttribute('aria-label', `${size} by ${size} base planning grid`);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.row = row;
      tile.dataset.column = column;
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}: empty`);
      grid.append(tile);
    }
  }

  sizeLabel.textContent = `${size} × ${size}`;
  tileCount.textContent = tiles.toLocaleString();
  status.textContent = `Planning canvas · ${tiles.toLocaleString()} tiles available`;
}

sizeSlider.addEventListener('input', () => renderGrid(Number(sizeSlider.value)));
renderGrid(Number(sizeSlider.value));
