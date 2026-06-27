'use strict';
const { test } = require('node:test');
const assert   = require('node:assert');
const fs       = require('node:fs');
const path     = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

// --- 1. games.json manifest ---

test('games.json exists and is valid JSON', () => {
  assert.ok(exists('games.json'), 'games.json must exist');
  const games = JSON.parse(read('games.json'));
  assert.ok(Array.isArray(games), 'games.json must be a JSON array');
});

test('games.json contains exactly 4 games', () => {
  const games = JSON.parse(read('games.json'));
  assert.strictEqual(games.length, 4, 'manifest must list exactly 4 games');
});

test('each game entry has required fields', () => {
  const games = JSON.parse(read('games.json'));
  for (const g of games) {
    assert.ok(g.id,    `game missing id: ${JSON.stringify(g)}`);
    assert.ok(g.title, `game missing title: ${JSON.stringify(g)}`);
    assert.ok(g.emoji, `game missing emoji: ${JSON.stringify(g)}`);
    assert.ok(g.route, `game missing route: ${JSON.stringify(g)}`);
    assert.ok(g.blurb, `game missing blurb: ${JSON.stringify(g)}`);
    assert.ok(g.accent, `game missing accent: ${JSON.stringify(g)}`);
    assert.ok(g.route.startsWith('/'), `route must start with /: ${g.route}`);
  }
});

test('games.json has word-blitz, snake, memory, and snake-duel', () => {
  const games = JSON.parse(read('games.json'));
  const ids = games.map(g => g.id);
  assert.ok(ids.includes('word-blitz'), 'word-blitz must be in manifest');
  assert.ok(ids.includes('snake'),      'snake must be in manifest');
  assert.ok(ids.includes('memory'),     'memory must be in manifest');
  assert.ok(ids.includes('snake-duel'), 'snake-duel must be in manifest');
});

// --- 2. HTML files exist ---

test('hub index.html exists', () => {
  assert.ok(exists('index.html'), 'index.html (hub) must exist');
});

test('word-blitz/index.html exists', () => {
  assert.ok(exists('word-blitz/index.html'), 'word-blitz/index.html must exist');
});

test('snake/index.html exists', () => {
  assert.ok(exists('snake/index.html'), 'snake/index.html must exist');
});

test('memory/index.html exists', () => {
  assert.ok(exists('memory/index.html'), 'memory/index.html must exist');
});

test('snake-duel page and engine exist', () => {
  assert.ok(exists('snake-duel/index.html'), 'snake-duel/index.html must exist');
  assert.ok(exists('snake-duel/engine.js'), 'snake-duel/engine.js must exist');
});

// --- 3. Hub page structure ---

test('hub page has game brand name', () => {
  const html = read('index.html');
  assert.ok(html.includes('My Plays'), 'hub must contain brand name');
});

test('hub page declares the myplays.net canonical', () => {
  const html = read('index.html');
  assert.ok(html.includes('<link rel="canonical" href="https://myplays.net/">'), 'hub must set the myplays.net canonical');
});

test('hub page fetches games.json manifest', () => {
  const html = read('index.html');
  assert.ok(html.includes('games.json'), 'hub must reference games.json');
});

test('hub page has gamesGrid element', () => {
  const html = read('index.html');
  assert.ok(html.includes('gamesGrid'), 'hub must have gamesGrid element');
});

// --- 4. Word Blitz game elements ---

test('word-blitz has back-to-hub link', () => {
  const html = read('word-blitz/index.html');
  assert.ok(html.includes('href="/"'), 'word-blitz must have link back to hub');
});

test('word-blitz has scramble/play mechanics', () => {
  const html = read('word-blitz/index.html');
  assert.ok(html.includes('scramble') || html.includes('WORD_BANK'), 'word-blitz must have game content');
});

// --- 5. Snake game elements ---

test('snake game has canvas', () => {
  const html = read('snake/index.html');
  assert.ok(html.includes('<canvas'), 'snake must use a canvas element');
});

test('snake game has score display', () => {
  const html = read('snake/index.html');
  assert.ok(html.includes('score') || html.includes('Score'), 'snake must show score');
});

test('snake game has replay button', () => {
  const html = read('snake/index.html');
  assert.ok(html.includes('btn-replay') || html.includes('Play Again'), 'snake must have replay button');
});

test('snake game has back-to-hub link', () => {
  const html = read('snake/index.html');
  assert.ok(html.includes('href="/"'), 'snake must have link back to hub');
});

// --- 6. Memory game elements ---

test('memory game has card grid', () => {
  const html = read('memory/index.html');
  assert.ok(html.includes('card-grid') || html.includes('flip-card'), 'memory must have card grid');
});

test('memory game has score/timer', () => {
  const html = read('memory/index.html');
  assert.ok(html.includes('timer') || html.includes('Timer'), 'memory must show timer');
  assert.ok(html.includes('moves') || html.includes('Moves'), 'memory must show moves');
});

test('memory game has replay button', () => {
  const html = read('memory/index.html');
  assert.ok(html.includes('btn-replay') || html.includes('Play Again'), 'memory must have replay button');
});

test('memory game has back-to-hub link', () => {
  const html = read('memory/index.html');
  assert.ok(html.includes('href="/"'), 'memory must have link back to hub');
});

// --- 7. SWA routing config ---

test('staticwebapp.config.json exists', () => {
  assert.ok(exists('staticwebapp.config.json'), 'staticwebapp.config.json must exist');
});

test('SWA config routes all three games', () => {
  const config = JSON.parse(read('staticwebapp.config.json'));
  const routes = config.routes || [];
  const routePaths = routes.map(r => r.route);
  assert.ok(routePaths.some(r => r.includes('word-blitz')), 'SWA must route /word-blitz');
  assert.ok(routePaths.some(r => r.includes('snake')),      'SWA must route /snake');
  assert.ok(routePaths.some(r => r.includes('memory')),     'SWA must route /memory');
  assert.ok(routePaths.some(r => r.includes('snake-duel')), 'SWA must route /snake-duel');
});

// --- 8. No em dashes in player-facing copy ---

test('hub has no em dashes in player-facing text', () => {
  const html = read('index.html');
  // Allow em dashes only inside HTML entities (&mdash;) or within code strings
  // Check raw em dash character U+2014
  const raw = html.replace(/&mdash;/g, '').replace(/&#8212;/g, '');
  const emDashIdx = raw.indexOf('\u2014');
  assert.strictEqual(emDashIdx, -1,
    `hub contains raw em dash at index ${emDashIdx}: "...${raw.slice(Math.max(0,emDashIdx-20), emDashIdx+20)}..."`);
});

test('snake has no em dashes in player-facing text', () => {
  const html = read('snake/index.html');
  const raw = html.replace(/&mdash;/g, '').replace(/&#8212;/g, '');
  assert.strictEqual(raw.indexOf('\u2014'), -1, 'snake must not use raw em dashes');
});

test('memory has no em dashes in player-facing text', () => {
  const html = read('memory/index.html');
  const raw = html.replace(/&mdash;/g, '').replace(/&#8212;/g, '');
  assert.strictEqual(raw.indexOf('\u2014'), -1, 'memory must not use raw em dashes');
});

test('snake-duel has no em dashes in player-facing text', () => {
  const html = read('snake-duel/index.html');
  const raw = html.replace(/&mdash;/g, '').replace(/&#8212;/g, '');
  assert.strictEqual(raw.indexOf('\u2014'), -1, 'snake-duel must not use raw em dashes');
});

test('snake-duel supports keyboard, phone pads, and online play', () => {
  const html = read('snake-duel/index.html');
  assert.ok(html.includes('W A S D'), 'must mention the WASD keys');
  assert.ok(html.includes('Arrow keys'), 'must mention the arrow keys');
  assert.ok(/class="pad/.test(html), 'must include on-screen touch pads');
  assert.ok(html.includes('peerjs'), 'must load PeerJS for online play');
  assert.ok(html.includes('Create game') && html.includes('Join game'), 'must offer online create and join');
  assert.ok(html.includes('/snake-duel/engine.js'), 'must load the engine');
});

