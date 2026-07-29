const GRID_SIZE = 35;
const grid = document.querySelector('#game-grid');
const status = document.querySelector('#status');
let selectedItem = 'foundation';

for (let row = 0; row < GRID_SIZE; row += 1) {
  for (let column = 0; column < GRID_SIZE; column += 1) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.dataset.row = row;
    tile.dataset.column = column;
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}: empty`);
    grid.append(tile);
  }
}

document.querySelectorAll('.palette-item').forEach((button) => {
  button.addEventListener('click', () => {
    selectedItem = button.dataset.item;
    document.querySelector('.palette-item.is-selected').classList.remove('is-selected');
    button.classList.add('is-selected');
    status.textContent = `${button.textContent.trim()} selected · click a tile to place`;
  });
});

grid.addEventListener('click', (event) => {
  const tile = event.target.closest('.tile');
  if (!tile) return;

  tile.dataset.item = selectedItem;
  tile.setAttribute('aria-label', `Row ${Number(tile.dataset.row) + 1}, column ${Number(tile.dataset.column) + 1}: ${selectedItem}`);
});

document.querySelector('#clear-grid').addEventListener('click', () => {
  grid.querySelectorAll('.tile[data-item]').forEach((tile) => {
    delete tile.dataset.item;
    tile.setAttribute('aria-label', `Row ${Number(tile.dataset.row) + 1}, column ${Number(tile.dataset.column) + 1}: empty`);
  });
  status.textContent = 'Grid cleared';
});
