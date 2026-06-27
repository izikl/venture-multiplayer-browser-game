'use strict';

// Unit tests for the Snake Duel engine: every owner rule is checked here.
const { test } = require('node:test');
const assert = require('node:assert');

const { createGame, DIRS } = require('../snake-duel/engine.js');

const MID = 7; // floor(15 / 2)

// A game with no food, so movement is fully deterministic for collision tests.
function quietGame(extra) {
  return createGame({ config: Object.assign({ foodCount: 0 }, extra || {}), rng: () => 0, now: () => 0 });
}

function setSnake(s, cells, dirName) {
  s.cells = cells.map((c) => ({ x: c[0], y: c[1] }));
  s.dir = DIRS[dirName];
  s.nextDir = DIRS[dirName];
  s.alive = true;
}

test('starts with 3 cubes each and status playing', () => {
  const g = createGame({ rng: () => 0 });
  assert.strictEqual(g.snakes[0].cells.length, 3);
  assert.strictEqual(g.snakes[1].cells.length, 3);
  assert.strictEqual(g.status, 'playing');
});

test('eating food grows the snake by one cube', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[5, MID], [4, MID], [3, MID]], 'right');
  setSnake(g.snakes[1], [[15, 1], [16, 1], [17, 1]], 'left');
  g.food = [{ x: 6, y: MID }];
  g.tickSnakes();
  assert.strictEqual(g.snakes[0].cells.length, 4);
  assert.strictEqual(g.status, 'playing');
});

test('reaching 6 cubes wins for that player', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[6, MID], [5, MID], [4, MID], [3, MID], [2, MID]], 'right');
  setSnake(g.snakes[1], [[15, 1], [16, 1], [17, 1]], 'left');
  g.food = [{ x: 7, y: MID }];
  g.tickSnakes();
  assert.strictEqual(g.snakes[0].cells.length, 6);
  assert.strictEqual(g.status, 'p1');
});

test('dropping to 0 cubes loses (shot away to nothing)', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[5, MID], [4, MID], [3, MID]], 'right');
  setSnake(g.snakes[1], [[7, MID]], 'left'); // single cube left
  assert.strictEqual(g.fire(1), true);
  g.tickProjectiles(); // projectile 6 -> 7, hits the lone head
  assert.strictEqual(g.snakes[1].cells.length, 0);
  assert.strictEqual(g.status, 'p1');
});

test('head into a wall loses', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[g.cols - 1, MID], [g.cols - 2, MID], [g.cols - 3, MID]], 'right');
  setSnake(g.snakes[1], [[5, 1], [4, 1], [3, 1]], 'right');
  g.tickSnakes();
  assert.strictEqual(g.status, 'p2'); // player 1 hit the wall
});

test('head into itself loses', () => {
  const g = quietGame();
  // Moving up drives the head onto an existing body cube.
  setSnake(g.snakes[0], [[5, 5], [4, 5], [4, 4], [5, 4], [6, 4]], 'up');
  setSnake(g.snakes[1], [[15, 12], [16, 12], [17, 12]], 'left');
  g.tickSnakes();
  assert.strictEqual(g.status, 'p2');
});

test('two heads colliding is a tie', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[5, MID], [4, MID], [3, MID]], 'right');
  setSnake(g.snakes[1], [[7, MID], [8, MID], [9, MID]], 'left');
  g.tickSnakes(); // both want cell (6, MID)
  assert.strictEqual(g.status, 'tie');
});

test('shooting the head makes the next cube the new head', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[5, MID], [4, MID], [3, MID]], 'right');
  setSnake(g.snakes[1], [[7, MID], [8, MID], [9, MID]], 'left');
  g.fire(1); // projectile spawns at (6, MID) going right
  g.tickProjectiles(); // -> (7, MID), the opponent head
  assert.strictEqual(g.snakes[1].cells.length, 2);
  assert.deepStrictEqual(g.snakes[1].cells[0], { x: 8, y: MID });
  assert.strictEqual(g.status, 'playing');
});

test('shooting a middle cube retracts the tail and stays continuous', () => {
  const g = quietGame();
  // Fire upward into the middle cube so the head is not hit first.
  setSnake(g.snakes[0], [[8, MID + 2], [8, MID + 3], [8, MID + 4]], 'up');
  setSnake(g.snakes[1], [[7, MID], [8, MID], [9, MID]], 'left');
  g.fire(1); // projectile spawns at (8, MID + 1) going up
  g.tickProjectiles(); // -> (8, MID), the middle cube
  assert.strictEqual(g.snakes[1].cells.length, 2);
  assert.deepStrictEqual(g.snakes[1].cells, [{ x: 7, y: MID }, { x: 8, y: MID }]);
  assert.strictEqual(g.status, 'playing');
});

test('a snake cannot reverse 180 degrees into itself', () => {
  const g = quietGame();
  setSnake(g.snakes[0], [[5, MID], [4, MID], [3, MID]], 'right');
  g.setDir(1, 'left'); // ignored
  assert.deepStrictEqual(g.snakes[0].nextDir, DIRS.right);
});

test('fire respects the cooldown', () => {
  let t = 0;
  const g = createGame({ config: { foodCount: 0 }, rng: () => 0, now: () => t });
  assert.strictEqual(g.fire(1), true);
  assert.strictEqual(g.fire(1), false); // still cooling down
  t = 1000;
  assert.strictEqual(g.fire(1), true);
});
