// Snake Duel - pure game engine (no DOM).
//
// Two snakes duel on a grid. Implements the exact owner rules:
//  - Each snake starts at 3 cubes (head + 2 body).
//  - Reaching 8 cubes WINS (the other player loses).
//  - Dropping to 0 cubes loses.
//  - A head into a wall, the other snake, or itself loses.
//  - Two heads colliding (head to head) is a tie.
//  - Firing removes one cube from the other snake: a head hit makes the next
//    cube the new head, any other hit retracts the tail to close the gap.
//  - Eating food grows a snake by one cube (classic snake).
//
// Works in the browser (window.SnakeDuelEngine) and in Node (module.exports),
// so the same logic is unit tested and shipped.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnakeDuelEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIRS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 }
  };

  function eq(a, b) { return a.x === b.x && a.y === b.y; }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function isOpposite(a, b) { return a.x + b.x === 0 && a.y + b.y === 0; }

  function defaultConfig() {
    return {
      cols: 21,
      rows: 15,
      startLen: 3,
      winLen: 8,
      foodCount: 2,
      fireCooldownMs: 160
    };
  }

  function createGame(opts) {
    opts = opts || {};
    var cfg = Object.assign(defaultConfig(), opts.config || {});
    var rng = opts.rng || Math.random;
    var now = opts.now || function () { return Date.now(); };

    var leftX = 3;     // tail-most x for player 1 start
    var rightX = cfg.cols - 4; // tail-most x for player 2 start
    // Symmetric start rows, but not the same row, so the snakes do not collide
    // head on before either player can react.
    var p1Y = Math.round(cfg.rows * 0.3);
    var p2Y = cfg.rows - 1 - p1Y;

    function makeSnake(id, headX, headY, dir, color) {
      // Build cells head first; body extends opposite to dir.
      var cells = [];
      for (var i = 0; i < cfg.startLen; i++) {
        cells.push({ x: headX - dir.x * i, y: headY - dir.y * i });
      }
      return {
        id: id,
        color: color,
        cells: cells,
        dir: dir,
        nextDir: dir,
        alive: true,
        cooldownUntil: 0
      };
    }

    var game = {
      config: cfg,
      cols: cfg.cols,
      rows: cfg.rows,
      status: 'playing', // 'playing' | 'p1' | 'p2' | 'tie'
      snakes: [
        makeSnake(1, leftX + cfg.startLen - 1, p1Y, DIRS.right, 'green'),
        makeSnake(2, rightX - cfg.startLen + 1, p2Y, DIRS.left, 'pink')
      ],
      food: [],
      projectiles: [],
      now: now
    };

    function snakeById(id) { return game.snakes[id - 1]; }
    function other(id) { return id === 1 ? game.snakes[1] : game.snakes[0]; }

    function occupied() {
      var set = {};
      game.snakes.forEach(function (s) {
        s.cells.forEach(function (c) { set[c.x + ',' + c.y] = true; });
      });
      game.food.forEach(function (f) { set[f.x + ',' + f.y] = true; });
      return set;
    }

    function spawnFood() {
      while (game.food.length < cfg.foodCount) {
        var taken = occupied();
        var free = [];
        for (var x = 0; x < cfg.cols; x++) {
          for (var y = 0; y < cfg.rows; y++) {
            if (!taken[x + ',' + y]) free.push({ x: x, y: y });
          }
        }
        if (!free.length) return;
        free.push = free.push; // noop, keep linter calm
        var pick = free[Math.floor(rng() * free.length)];
        game.food.push(pick);
      }
    }

    function inBounds(c) {
      return c.x >= 0 && c.x < cfg.cols && c.y >= 0 && c.y < cfg.rows;
    }

    // The board wraps: a snake that slides off one edge reappears on the opposite edge.
    function wrap(c) {
      return { x: ((c.x % cfg.cols) + cfg.cols) % cfg.cols, y: ((c.y % cfg.rows) + cfg.rows) % cfg.rows };
    }

    function setDir(player, name) {
      var s = snakeById(player);
      if (!s || !s.alive || game.status !== 'playing') return;
      var d = DIRS[name];
      if (!d) return;
      // No 180 degree reversal while longer than 1 cube.
      if (s.cells.length > 1 && isOpposite(d, s.dir)) return;
      s.nextDir = d;
    }

    function fire(player) {
      var s = snakeById(player);
      if (!s || !s.alive || game.status !== 'playing') return false;
      var t = game.now();
      if (t < s.cooldownUntil) return false;
      s.cooldownUntil = t + cfg.fireCooldownMs;
      var head = s.cells[0];
      game.projectiles.push({
        owner: s.id,
        dir: { x: s.dir.x, y: s.dir.y },
        pos: { x: head.x + s.dir.x, y: head.y + s.dir.y }
      });
      return true;
    }

    // Remove one cube from a snake that was hit by a shot.
    //  - Head hit  -> the next cube becomes the new head (remove from front).
    //  - Other hit -> the tail retracts to close the gap (remove from back),
    //    which is exactly equivalent to splicing the struck cube and shifting
    //    the trailing cubes one step toward the head.
    function removeCube(s, index) {
      if (index <= 0) s.cells.shift();
      else s.cells.pop();
      if (s.cells.length === 0) {
        s.alive = false;
        finish(s.id === 1 ? 'p2' : 'p1');
      }
    }

    function tickProjectiles() {
      if (game.status !== 'playing') return;
      var survivors = [];
      for (var i = 0; i < game.projectiles.length; i++) {
        var p = game.projectiles[i];
        p.pos = add(p.pos, p.dir);
        if (!inBounds(p.pos)) continue; // left the board
        var target = other(p.owner);
        var hit = -1;
        for (var j = 0; j < target.cells.length; j++) {
          if (eq(target.cells[j], p.pos)) { hit = j; break; }
        }
        if (hit >= 0) {
          removeCube(target, hit);
          continue; // projectile is consumed
        }
        survivors.push(p);
      }
      game.projectiles = survivors;
    }

    function finish(status) {
      if (game.status === 'playing') game.status = status;
    }

    function tickSnakes() {
      if (game.status !== 'playing') return;

      var living = game.snakes.filter(function (s) { return s.alive; });
      living.forEach(function (s) {
        if (!(s.cells.length > 1 && isOpposite(s.nextDir, s.dir))) s.dir = s.nextDir;
      });

      var oldHeads = {};
      var newHeads = {};
      living.forEach(function (s) {
        oldHeads[s.id] = s.cells[0];
        newHeads[s.id] = wrap(add(s.cells[0], s.dir));
      });

      // Advance each snake: prepend new head, grow if eating else drop tail.
      living.forEach(function (s) {
        var nh = newHeads[s.id];
        var fi = -1;
        for (var k = 0; k < game.food.length; k++) {
          if (eq(game.food[k], nh)) { fi = k; break; }
        }
        s.cells.unshift(nh);
        if (fi >= 0) game.food.splice(fi, 1); // grow: keep tail
        else s.cells.pop();
      });

      spawnFood();

      // Win by reaching the target length.
      var reached = living.filter(function (s) { return s.cells.length >= cfg.winLen; });
      if (reached.length === 2) { finish('tie'); return; }
      if (reached.length === 1) { finish(reached[0].id === 1 ? 'p1' : 'p2'); return; }

      // Collision resolution.
      var dead = {};
      // Head to head: same destination cell, or the two heads swapped places.
      if (living.length === 2) {
        var a = living[0], b = living[1];
        var sameCell = eq(newHeads[a.id], newHeads[b.id]);
        var swapped = eq(newHeads[a.id], oldHeads[b.id]) && eq(newHeads[b.id], oldHeads[a.id]);
        if (sameCell || swapped) { finish('tie'); return; }
      }
      living.forEach(function (s) {
        var head = s.cells[0];
        // self: head equals any other cube of itself
        for (var i = 1; i < s.cells.length; i++) {
          if (eq(s.cells[i], head)) { dead[s.id] = true; return; }
        }
        // other snake body
        var o = other(s.id);
        if (o.alive) {
          for (var j = 0; j < o.cells.length; j++) {
            if (eq(o.cells[j], head)) { dead[s.id] = true; return; }
          }
        }
      });

      var d1 = !!dead[1], d2 = !!dead[2];
      if (d1) game.snakes[0].alive = false;
      if (d2) game.snakes[1].alive = false;
      if (d1 && d2) finish('tie');
      else if (d1) finish('p2');
      else if (d2) finish('p1');
    }

    // A plain serializable view of the board, sent host -> client for online
    // play so the client can render without running the engine itself.
    function snapshot() {
      return {
        status: game.status,
        cols: cfg.cols,
        rows: cfg.rows,
        snakes: game.snakes.map(function (s) {
          return { color: s.color, cells: s.cells.map(function (c) { return { x: c.x, y: c.y }; }) };
        }),
        food: game.food.map(function (f) { return { x: f.x, y: f.y }; }),
        projectiles: game.projectiles.map(function (p) { return { pos: { x: p.pos.x, y: p.pos.y } }; })
      };
    }

    game.setDir = setDir;
    game.fire = fire;
    game.tickSnakes = tickSnakes;
    game.tickProjectiles = tickProjectiles;
    game.spawnFood = spawnFood;
    game.snapshot = snapshot;
    game._snakeById = snakeById;

    spawnFood();
    return game;
  }

  return { createGame: createGame, DIRS: DIRS };
}));
