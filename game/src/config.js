// Every tuning number, recipe and colour for Sizzle & Serve — Dapur Kilat, in one
// place. The kitchen is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Length of one shift, in seconds. */
export const SHIFT_SECONDS = 180;

/** Expired orders allowed before the shift ends early. */
export const MAX_STRIKES = 3;

export const CHEF = {
  radius: 17,
  speed: 340,
  /** How close the chef must be to a station counter to use it. */
  reach: 58,
};

export const CHOP_SECONDS = 1.5;
export const COOK_SECONDS = 3;
/** Seconds a finished cook may sit on the heat before it burns. */
export const BURN_GRACE = 10;

/** How long an order waits on the board before it expires, in seconds. */
export const ORDER_PATIENCE = 60;
/** Seconds between new orders at the start of the shift, shrinking as it goes on. */
export const ORDER_INTERVAL_START = 14;
export const ORDER_INTERVAL_MIN = 7;
export const ORDER_INTERVAL_SHRINK = 0.45;
/** Most tickets the board ever holds at once. */
export const MAX_ORDERS = 4;

/** Streak multipliers: x2 from 3 on-time serves in a row, x3 from 5. */
export const STREAK_DOUBLE_AT = 3;
export const STREAK_TRIPLE_AT = 5;
/** Coins for serving a dish nobody ordered (a small tip, no streak). */
export const UNORDERED_TIP = 2;
/** Score points per coin earned, plus a flat bonus per dish served. */
export const SCORE_PER_COIN = 10;
export const SCORE_PER_DISH = 25;

/**
 * Stations, drawn as labelled counters around the kitchen floor. Pantry slots run
 * left to right in INGREDIENTS order; the chef's x position over the pantry picks
 * the slot, and a mouse click on a slot picks that ingredient directly.
 */
export const STATIONS = {
  pantry: { x: 30, y: 140, width: 240, height: 90, label: 'PANTRY' },
  board: { x: 30, y: 300, width: 200, height: 80, label: 'CHOPPING BOARD' },
  pot: { x: 30, y: 420, width: 200, height: 80, label: 'POT — BOIL' },
  stove: { x: 1010, y: 140, width: 240, height: 90, label: 'STOVE — FRY' },
  window: { x: 560, y: 140, width: 260, height: 70, label: 'SERVING WINDOW' },
  plating: { x: 470, y: 560, width: 340, height: 90, label: 'PLATING' },
  trash: { x: 1120, y: 560, width: 130, height: 80, label: 'TRASH' },
};

/** Burner centres on the stove, and the pot's single slot centre. */
export const STOVE_BURNERS = [
  { x: 1070, y: 185 },
  { x: 1190, y: 185 },
];
export const POT_SLOT = { x: 130, y: 460 };

export const INGREDIENTS = {
  rice: { label: 'Rice', colour: '#f5efe0', chop: false },
  noodle: { label: 'Noodle', colour: '#f2c14e', chop: false },
  egg: { label: 'Egg', colour: '#fdf6d8', chop: true },
  chicken: { label: 'Chicken', colour: '#e8a06a', chop: true },
  tomato: { label: 'Tomato', colour: '#d94f3d', chop: true },
  chilli: { label: 'Chilli', colour: '#c62f2f', chop: true },
};
/** Pantry slot order, left to right. */
export const PANTRY_ORDER = ['rice', 'noodle', 'egg', 'chicken', 'tomato', 'chilli'];

/**
 * Recipes. Each component names the ingredient and the prep it needs before it may
 * go on a plate: chop (at the board) and cook on the stove or in the pot. A plate
 * holding exactly one recipe's set, each in its required state, becomes that dish.
 */
export const RECIPES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    coins: 12,
    components: [
      { ing: 'rice', chop: false, cook: 'stove' },
      { ing: 'egg', chop: true, cook: 'stove' },
      { ing: 'chilli', chop: true, cook: null },
    ],
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    coins: 14,
    components: [
      { ing: 'noodle', chop: false, cook: 'stove' },
      { ing: 'egg', chop: true, cook: 'stove' },
      { ing: 'chicken', chop: true, cook: 'stove' },
    ],
  },
  {
    id: 'sate-ayam',
    name: 'Sate Ayam',
    coins: 16,
    components: [
      { ing: 'chicken', chop: true, cook: 'stove' },
      { ing: 'chilli', chop: true, cook: null },
    ],
  },
  {
    id: 'telur-dadar',
    name: 'Telur Dadar',
    coins: 10,
    components: [
      { ing: 'egg', chop: true, cook: 'stove' },
      { ing: 'tomato', chop: true, cook: 'stove' },
    ],
  },
  {
    id: 'sup-ayam',
    name: 'Sup Ayam',
    coins: 15,
    components: [
      { ing: 'chicken', chop: true, cook: 'pot' },
      { ing: 'tomato', chop: true, cook: 'pot' },
    ],
  },
  {
    id: 'soto-ayam',
    name: 'Soto Ayam',
    coins: 17,
    components: [
      { ing: 'noodle', chop: false, cook: 'pot' },
      { ing: 'chicken', chop: true, cook: 'pot' },
      { ing: 'chilli', chop: true, cook: null },
    ],
  },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

export const PALETTE = {
  wall: '#0f5257',
  wallDark: '#0b3d40',
  floorA: '#c98a5a',
  floorB: '#bd7f52',
  floorLine: '#a96f47',
  counter: '#8a5a33',
  counterTop: '#a9713f',
  counterEdge: '#6e4525',
  board: '#e8d9b0',
  boardEdge: '#b39b62',
  steel: '#c9d2d8',
  steelDark: '#8fa0a8',
  ticket: '#fdf3d8',
  ticketInk: '#3a2a1a',
  text: '#fff7e8',
  muted: '#cfe3dd',
  accent: '#ffb703',
  danger: '#e4572e',
  good: '#7fb069',
  hud: '#123332',
  hudEdge: '#0a2322',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
