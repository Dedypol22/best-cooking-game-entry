// The screenshot scenes behind ?shot=start|play|rush|end. Each one plays the real
// rules forward from a fresh world with a scripted chef — the same movement and
// interact calls a player makes — so every frame is what a real game looks like and
// the same seed always gives the same frame. The chef walks through two clear
// corridors (x=300 on the left, x=950 on the right) so no scripted leg ever pushes
// against a counter.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const END_LIMIT_SECONDS = 600;

// Where the chef stands to use each station (just outside its counter, inside reach).
const STAND = {
  rice: { x: 50, y: 252 },
  noodle: { x: 90, y: 252 },
  egg: { x: 130, y: 252 },
  chicken: { x: 170, y: 252 },
  tomato: { x: 210, y: 252 },
  chilli: { x: 250, y: 252 },
  stove1: { x: 1070, y: 252 },
  stove2: { x: 1190, y: 252 },
  board: { x: 252, y: 340 },
  plating: { x: 640, y: 538 },
  platingSide: { x: 860, y: 540 },
  window: { x: 690, y: 246 },
};

/** Step the world until the chef is within 8 px of (x, y), or 10 s pass. */
function moveTo(world, x, y) {
  const chef = world.state.chef;
  let guard = 0;
  while (Math.hypot(chef.x - x, chef.y - y) > 8 && guard < 600) {
    world.step(STEP, x - chef.x, y - chef.y, false);
    guard += 1;
  }
}

/** Walk to a stand point through the nearest clear corridor. */
function goTo(world, point) {
  const corridorX = point.x < 640 ? 300 : 950;
  const chef = world.state.chef;
  moveTo(world, corridorX, chef.y);
  moveTo(world, corridorX, point.y);
  moveTo(world, point.x, point.y);
}

/** Let the world run with the chef standing still. */
function wait(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) world.step(STEP, 0, 0, false);
}

/** One press of Space at the station the chef stands by. */
function use(world) {
  world.interact();
}

/** Fetch an ingredient from the pantry and put it where the script says. */
function fetch(world, ingredient) {
  goTo(world, STAND[ingredient]);
  use(world);
}

/** Chop the held ingredient on the board and take it back chopped. */
function chopHeld(world) {
  goTo(world, STAND.board);
  use(world);
  wait(world, 1.8);
  use(world);
}

/** Fry the held ingredient on a stove burner and take it back cooked. */
function fryHeld(world, burner) {
  goTo(world, STAND[burner]);
  use(world);
  wait(world, 3.4);
  use(world);
}

/**
 * Cook a Nasi Goreng (rice + egg + chilli) and leave the finished plate on the
 * plating counter, then start a Mie Goreng so a second plate sits mid-assembly.
 * Returns the world at a frame showing the order board, ingredients on the
 * counters, a dish mid-assembly, the shift timer and a finished plate.
 */
function playScript(world) {
  // Egg first: chop it, then fry it on the second burner.
  fetch(world, 'egg');
  chopHeld(world);
  fryHeld(world, 'stove2');
  // Plate the cooked egg while the rice fries.
  goTo(world, STAND.plating);
  use(world);
  // Rice straight onto the first burner; it fries while the chef preps the rest.
  fetch(world, 'rice');
  goTo(world, STAND.stove1);
  use(world);
  // Chilli: chop and plate.
  fetch(world, 'chilli');
  chopHeld(world);
  goTo(world, STAND.plating);
  use(world);
  // Rice is cooked by now: plate it — the Nasi Goreng is complete and ready.
  goTo(world, STAND.stove1);
  use(world);
  goTo(world, STAND.plating);
  use(world);
  // Second dish, mid-assembly: a cooked noodle on a fresh plate.
  fetch(world, 'noodle');
  fryHeld(world, 'stove1');
  goTo(world, STAND.plating);
  use(world);
  // A tomato waiting on the chopping board: ingredients on the counters.
  fetch(world, 'tomato');
  goTo(world, STAND.board);
  use(world);
  // End standing beside the plating counter, both plates in clear view.
  goTo(world, STAND.platingSide);
}

/** Pick the finished dish off the plating counter and serve it at the window. */
function serveFinishedDish(world) {
  goTo(world, STAND.plating);
  use(world);
  goTo(world, STAND.window);
  use(world);
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'rush' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  playScript(world);
  if (name === 'play') {
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'rush') {
    serveFinishedDish(world);
    // The rush: a full board, one ticket almost out of patience. The near-empty
    // ticket is a real order spawned by the rules, given the patience an order
    // that arrived a while ago would have left.
    while (world.state.orders.length < 4) {
      const next = ['sate-ayam', 'sup-ayam', 'telur-dadar', 'mie-goreng'][world.state.orders.length];
      world.debugSpawnOrder(next, 40);
    }
    world.debugSetPatience(0, 4);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // end: serve once for coins on the results screen, then stand still while the
  // orders expire — three strikes end the shift.
  serveFinishedDish(world);
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    if (world.step(STEP, 0, 0, false) & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
