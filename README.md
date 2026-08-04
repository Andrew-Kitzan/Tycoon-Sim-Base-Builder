# Tycoon Sim 2 Base Planner

This repository contains a browser-based grid for building, saving, loading, and simulating Tycoon Sim 2 bases.

> **Base generation is in beta and should not be used yet.** Use **Build mode** to create and test layouts manually.

## Download and open the planner

Choose **one** of the setup methods below. You can download the repository as a ZIP, clone it with Git, or fork it and then clone your fork. You do not need to use every method.

- **Download ZIP — recommended for most players:** Choose this if you only want to use the planner. It is the easiest option and does not require Git or a GitHub account.
- **Clone with Git:** Choose this if you want a local copy connected to the original repository so you can pull future updates or make local changes with version control.
- **Fork and clone:** Choose this if you want your own GitHub copy, plan to publish or share your changes, or may want to contribute changes back to the original repository.

### Download as a ZIP

1. Open the repository page on GitHub.
2. Select **Code → Download ZIP**.
3. Extract the entire ZIP to a normal folder. Do not open `index.html` from inside the ZIP.
4. Open the extracted folder.
5. Double-click `index.html` to open the planner in your browser.

### Clone with Git

```powershell
git clone <repository-url>
cd "Tycoon Sim 2"
```

Then open `index.html` in your browser. The grid does not require an installation, build command, or web server.

### Fork and clone

1. Sign in to GitHub and open the repository page.
2. Select **Fork**, then create the fork under your GitHub account.
3. Open your new fork and copy its repository URL from the **Code** menu.
4. Clone your fork and enter its folder:

```powershell
git clone <your-fork-url>
cd "Tycoon Sim 2"
```

5. Open `index.html` in your browser.

Forking by itself only creates a copy on GitHub. You must also clone your fork or download its ZIP before you can open the planner on your computer.

Keep all repository files and folders together. The planner needs the JavaScript files and the `data` folder beside `index.html`.

## Access the grid

The planner opens in **Build mode**. The item library is on the left and the grid is on the right.

- **Base size:** Drag the slider or use its `−` and `+` buttons.
- **Grid zoom:** Drag the slider or use its `−` and `+` buttons.
- **Clear grid:** Removes the current layout after confirmation.
- Base size, zoom, and the current Build-mode layout are saved automatically in the browser and restored after a refresh.

## Use the build menu

1. Choose **Droppers**, **Upgraders**, **Furnaces**, or **Conveyors**.
2. Search for an item by name, or open **Filter & sort** to filter by tier or variant and change the sorting order.
3. Select an item from the list.
4. Move the pointer over the grid to preview its footprint, processing area, portable beam, and facing direction.
5. Press `R` to rotate it 90° clockwise.
6. Click an open location to place it.

The selected item keeps its current direction after placement, allowing several copies to be placed with the same orientation.

To place many copies in a straight line, hold the left mouse button and drag. Placement locks to the horizontal or vertical axis.

Press `Esc` while placing an item to cancel placement.

## Edit placed items

Hover over a placed item or conveyor to use these shortcuts:

| Control | Action |
| --- | --- |
| `M` | Move the highlighted placement with the mouse |
| `C` | Copy the highlighted placement and begin placing another copy |
| `Backspace` or `Delete` | Remove the highlighted placement |

Clicking a placed item also opens its editor. The editor can move it to a typed coordinate, move it with the mouse, rotate it left or right, or remove it.

While moving an item:

| Control | Action |
| --- | --- |
| `R` | Rotate it 90° clockwise |
| Click | Place it at the previewed location |
| `Esc` | Cancel the move |

Invalid placements are rejected when they overlap another placement or extend outside the selected plot size.

## Select and edit a group

When no build-menu item is selected, drag from an empty grid tile to draw a selection box. Every placement touched by the box becomes part of the group.

Selected placements receive a gold outline and a large direction arrow. The group panel provides **Rotate all 90°**, **Move selection**, and **Delete selection**.

| Control | Action |
| --- | --- |
| `R` | Rotate all selected placements 90° clockwise |
| `M` | Move the selected group while preserving its spacing |
| `Esc` | Cancel and clear the group selection |

Group rotations and moves are only accepted when every selected placement remains valid.

## Simulate a base

Select **Simulate base** after finishing a layout. The simulation calculates route completion, travel time, active ore, the ore limit, furnace throughput, ore destruction, survival, expected cash per minute, and remaining space. Hover over simulated items to see their route-specific before-and-after values and other relevant effects.

Editing the grid invalidates the old simulation. Run **Simulate base** again after any change.

## Save and share bases

The **Load Bases** and **Save Base** controls are beside the Base Planner title.

**Save Base** stays disabled until the current grid has been simulated. After simulation:

1. Select **Save Base**.
2. Enter a setup name.
3. Review the automatically detected benchmark information.
4. Select **Save Base** in the dialog.
5. Choose this repository's `saved-loadouts` folder if the browser asks for a destination.

The planner keeps the loadout in its browser library and creates a shareable `*.tycoon-loadout.json` file. If direct folder access is unavailable, the file downloads normally; move it into `saved-loadouts` manually.

To share a setup, send its `.tycoon-loadout.json` file to another player. They can copy it into their own `saved-loadouts` folder.

## Load a saved base

1. Select **Load Bases** beside the Base Planner title.
2. If necessary, choose **Import saved-loadouts folder** or **Import JSON files**.
3. Select a loadout from the scrollable list to view its important statistics.
4. Choose one of the available actions:
   - **Preview:** Displays the saved layout without changing the current grid.
   - **Load Base:** Opens a final warning before replacing the current grid.
   - **Delete:** Removes the loadout from the browser library and also deletes
     its matching `.tycoon-loadout.json` file from the imported folder. If the
     browser requests folder access again, select that same folder.
5. To replace the current grid, select **Load anyway**. Select **Never mind** to keep the current layout unchanged.

Always save the current base first if you may want to return to it.

## Generation mode warning

**Generation mode is currently in beta and should not be used yet.** Its automatic base-generation workflow is unfinished. Stay in **Build mode** for creating, editing, simulating, saving, and loading bases.
