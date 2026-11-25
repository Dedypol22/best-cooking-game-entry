// The game's rules and state, with no drawing and no browser in it: the chef, the
// stations, ingredients and their states, recipes, the order board, patience, streaks
// and strikes. step() advances one fixed step; interact() is called once per press
// (or per click) and works on the nearest station in reach. Nothing here allocates
// after createWorld returns, except the small order and plate lists the rules need.
import {
  BURN_GRACE,
  CHEF,
  CHOP_SECONDS,
  COOK_SECONDS,
  MAX_ORDERS,
  MAX_STRIKES,
  ORDER_INTERVAL_MIN,
  ORDER_INTERVAL_SHRINK,
  ORDER_INTERVAL_START,
  ORDER_PATIENCE,
  PANTRY_ORDER,
  POT_SLOT,
  RECIPES,
  SCORE_PER_COIN,
  SCORE_PER_DISH,
  SHIFT_SECONDS,
  STATIONS,
  STOVE_BURNERS,
  STREAK_DOUBLE_AT,
  STREAK_TRIPLE_AT,
  UNORDERED_TIP,
  recipeById,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_CHOP_DONE = 2;
export const EVENT_COOK_DONE = 4;
export const EVENT_BURNT = 8;
export const EVENT_DISH_READY = 16;
export const EVENT_SERVE = 32;
export const EVENT_STRIKE = 64;
export const EVENT_OVER = 128;
export const EVENT_TRASH = 256;

const STATION_RECTS = Object.entries(STATIONS).map(([id, rect]) => ({ id, ...rect }));

function distanceToRect(x, y, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return Math.hypot(x - cx, y - cy);
}

/** The state an ingredient must be in to count for a recipe component. */
function requiredState(component) {
  if (component.cook) return 'cooked';
  if (component.chop) return 'chopped';
  return 'raw';
}

/** True when a held ingredient may go on a plate (its prep is finished). */
function isPlateReady(item) {
  if (item.kind !== 'ing') return false;
  if (item.state === 'burnt') return false;
  // Rice and noodle only ever need cooking; everything else needs chopping first.
  if (item.ing === 'rice' || item.ing === 'noodle') return item.state === 'cooked';
  return item.state === 'chopped' || item.state === 'cooked';
}

/** The plate's dish once its items exactly match a recipe, or null. */
function dishFor(items) {
  const ids = items.map((item) => item.ing).sort().join(',');
  for (const recipe of RECIPES) {
    const wanted = recipe.components.map((c) => c.ing).sort().join(',');
    if (ids !== wanted) continue;
    const ok = recipe.components.every((component) => {
      const item = items.find((entry) => entry.ing === component.ing);
      return item && item.state === requiredState(component);
    });
    if (ok) return recipe.id;
  }
  return null;
}

/** True when no recipe could ever grow out of these plate items (a wrong extra). */
function isMush(items) {
  const ids = new Set(items.map((item) => item.ing));
  return !RECIPES.some((recipe) => {
    const wanted = new Set(recipe.components.map((c) => c.ing));
    if (ids.size > wanted.size) return false;
    for (const id of ids) if (!wanted.has(id)) return false;
    return true;
  });
}

export function createWorld(random) {
  const chef = { x: 640, y: 420, held: null };
  const board = { item: null, progress: 0 };
  const stove = [
    { item: null, progress: 0, burn: 0 },
    { item: null, progress: 0, burn: 0 },
  ];
  const pot = { item: null, progress: 0, burn: 0 };
  const plates = [];
  const orders = [];
  const state = {
    chef,
    board,
    stove,
    pot,
    plates,
    orders,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    score: 0,
    dishesServed: 0,
    streak: 0,
    bestStreak: 0,
    strikes: 0,
    over: false,
    overReason: '',
    spawnTimer: ORDER_INTERVAL_START,
    spawns: 0,
  };

  function reset() {
    chef.x = 640;
    chef.y = 420;
    chef.held = null;
    board.item = null;
    board.progress = 0;
    for (const burner of stove) {
      burner.item = null;
      burner.progress = 0;
      burner.burn = 0;
    }
    pot.item = null;
    pot.progress = 0;
    pot.burn = 0;
    plates.length = 0;
    orders.length = 0;
    state.elapsed = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.coins = 0;
    state.score = 0;
    state.dishesServed = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.strikes = 0;
    state.over = false;
    state.overReason = '';
    state.spawnTimer = ORDER_INTERVAL_START;
    state.spawns = 0;
    spawnOrder();
    spawnOrder();
  }

  function spawnOrder() {
    if (orders.length >= MAX_ORDERS) return;
    const open = new Set(orders.map((order) => order.recipeId));
    const fresh = RECIPES.filter((recipe) => !open.has(recipe.id));
    const recipe = random.pick(fresh.length > 0 ? fresh : RECIPES);
    orders.push({ recipeId: recipe.id, patience: ORDER_PATIENCE, max: ORDER_PATIENCE });
    state.spawns += 1;
  }

  function orderInterval() {
    return Math.max(
      ORDER_INTERVAL_MIN,
      ORDER_INTERVAL_START - (ORDER_INTERVAL_SHRINK / 10) * state.elapsed,
    );
  }

  function endShift(reason) {
    if (state.over) return EVENT_OVER;
    state.over = true;
    state.overReason = reason;
    return EVENT_OVER;
  }

  function moveChef(dt, dx, dy) {
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const nx = (dx / length) * CHEF.speed * dt;
    const ny = (dy / length) * CHEF.speed * dt;
    chef.x = Math.max(20 + CHEF.radius, Math.min(1280 - 20 - CHEF.radius, chef.x + nx));
    chef.y = Math.max(140, Math.min(720 - 17 - CHEF.radius, chef.y + ny));
    // Push the chef out of any counter rectangle he walked into.
    for (const rect of STATION_RECTS) {
      const nearestX = Math.max(rect.x, Math.min(chef.x, rect.x + rect.width));
      const nearestY = Math.max(rect.y, Math.min(chef.y, rect.y + rect.height));
      const ox = chef.x - nearestX;
      const oy = chef.y - nearestY;
      const dist = Math.hypot(ox, oy);
      if (dist >= CHEF.radius) continue;
      if (dist === 0) {
        chef.y = rect.y + rect.height + CHEF.radius;
        continue;
      }
      chef.x = nearestX + (ox / dist) * CHEF.radius;
      chef.y = nearestY + (oy / dist) * CHEF.radius;
    }
  }

  function cookSlot(slot, dt) {
    if (!slot.item) return 0;
    if (slot.item.state === 'burnt') return 0; // Burnt stays burnt until it is trashed.
    if (slot.item.state === 'cooked') {
      slot.burn += dt;
      if (slot.burn > BURN_GRACE) {
        slot.item.state = 'burnt';
        slot.burn = 0;
        return EVENT_BURNT;
      }
      return 0;
    }
    slot.progress += dt / COOK_SECONDS;
    if (slot.progress >= 1) {
      slot.progress = 1;
      slot.item.state = 'cooked';
      slot.burn = 0;
      return EVENT_COOK_DONE;
    }
    return 0;
  }

  function step(dt, dx, dy, harmless) {
    let events = 0;
    if (state.over) return events;
    moveChef(dt, dx, dy);
    state.elapsed += dt;

    // Chopping only advances while the chef stands at the board.
    if (board.item && board.item.state === 'raw' && distanceToRect(chef.x, chef.y, STATIONS.board) <= CHEF.reach + 20) {
      board.progress += dt / CHOP_SECONDS;
      if (board.progress >= 1) {
        board.progress = 1;
        board.item.state = 'chopped';
        events |= EVENT_CHOP_DONE;
      }
    }
    events |= cookSlot(stove[0], dt);
    events |= cookSlot(stove[1], dt);
    events |= cookSlot(pot, dt);

    if (harmless) return events;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    if (state.timeLeft <= 0) {
      events |= endShift('time');
      return events;
    }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      state.spawnTimer += orderInterval();
    }
    for (let index = orders.length - 1; index >= 0; index -= 1) {
      const order = orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        orders.splice(index, 1);
        state.strikes += 1;
        state.streak = 0;
        events |= EVENT_STRIKE;
        if (state.strikes >= MAX_STRIKES) {
          events |= endShift('strikes');
          return events;
        }
      }
    }
    return events;
  }

  /** The station id nearest the chef within reach, or null. */
  function nearestStation() {
    let bestId = null;
    let bestDistance = Infinity;
    for (const rect of STATION_RECTS) {
      const distance = distanceToRect(chef.x, chef.y, rect);
      if (distance <= CHEF.reach && distance < bestDistance) {
        bestDistance = distance;
        bestId = rect.id;
      }
    }
    return bestId;
  }

  function pantrySlotAt(x) {
    const slotWidth = STATIONS.pantry.width / PANTRY_ORDER.length;
    const index = Math.max(0, Math.min(PANTRY_ORDER.length - 1, Math.floor((x - STATIONS.pantry.x) / slotWidth)));
    return PANTRY_ORDER[index];
  }

  function takeFromCooker(slot) {
    if (!slot.item || chef.held) return 0;
    chef.held = slot.item;
    slot.item = null;
    slot.progress = 0;
    slot.burn = 0;
    return EVENT_PICKUP;
  }

  function putOnCooker(slot, cooker) {
    if (!chef.held || chef.held.kind !== 'ing' || slot.item) return 0;
    const item = chef.held;
    if (cooker === 'stove') {
      if (item.state === 'burnt') return 0;
      if (item.ing === 'rice' || item.ing === 'noodle') {
        if (item.state !== 'raw') return 0;
      } else if (item.state !== 'chopped') return 0;
    } else {
      // Boiling takes chopped veg and chicken, or raw rice and noodle
      // straight in — noodles and rice boil from raw, they are never chopped.
      if (item.ing === 'rice' || item.ing === 'noodle') {
        if (item.state !== 'raw') return 0;
      } else if (item.state !== 'chopped') return 0;
    }
    slot.item = item;
    slot.progress = 0;
    slot.burn = 0;
    chef.held = null;
    return EVENT_PICKUP;
  }

  function interactAtStation(stationId, clickX) {
    if (!stationId) return 0;
    if (stationId === 'pantry') {
      if (chef.held) return 0;
      const ing = clickX === null ? pantrySlotAt(chef.x) : pantrySlotAt(clickX);
      chef.held = { kind: 'ing', ing, state: 'raw' };
      return EVENT_PICKUP;
    }
    if (stationId === 'board') {
      if (!board.item) {
        if (!chef.held || chef.held.kind !== 'ing' || chef.held.state !== 'raw') return 0;
        const def = { rice: false, noodle: false, egg: true, chicken: true, tomato: true, chilli: true };
        if (!def[chef.held.ing]) return 0;
        board.item = chef.held;
        board.progress = 0;
        chef.held = null;
        return EVENT_PICKUP;
      }
      if (chef.held) return 0;
      chef.held = board.item;
      board.item = null;
      board.progress = 0;
      return EVENT_PICKUP;
    }
    if (stationId === 'stove') {
      if (chef.held) {
        for (const burner of stove) {
          const placed = putOnCooker(burner, 'stove');
          if (placed) return placed;
        }
        return 0;
      }
      // Take the most finished burner first: cooked, then furthest along.
      const cooked = stove.find((burner) => burner.item && burner.item.state === 'cooked');
      if (cooked) return takeFromCooker(cooked);
      const busy = stove.filter((burner) => burner.item).sort((a, b) => b.progress - a.progress)[0];
      return busy ? takeFromCooker(busy) : 0;
    }
    if (stationId === 'pot') {
      if (chef.held) return putOnCooker(pot, 'pot');
      return takeFromCooker(pot);
    }
    if (stationId === 'plating') {
      if (chef.held && chef.held.kind === 'plate') {
        if (plates.length >= 2) return 0;
        plates.push(chef.held);
        chef.held = null;
        return EVENT_PICKUP;
      }
      if (chef.held && chef.held.kind === 'ing') {
        if (!isPlateReady(chef.held)) return 0;
        let plate = plates.find((candidate) => !candidate.dish && !candidate.mush
          && !candidate.items.some((entry) => entry.ing === chef.held.ing));
        if (!plate && plates.length < 2) {
          plate = { kind: 'plate', items: [], dish: null, mush: false };
          plates.push(plate);
        }
        if (!plate) return 0;
        plate.items.push(chef.held);
        chef.held = null;
        const dish = dishFor(plate.items);
        if (dish) {
          plate.dish = dish;
          return EVENT_DISH_READY;
        }
        if (isMush(plate.items)) plate.mush = true;
        return EVENT_PICKUP;
      }
      if (!chef.held) {
        const finished = plates.findIndex((plate) => plate.dish);
        const index = finished >= 0 ? finished : plates.length - 1;
        if (index < 0) return 0;
        chef.held = plates.splice(index, 1)[0];
        return EVENT_PICKUP;
      }
      return 0;
    }
    if (stationId === 'window') {
      if (!chef.held || chef.held.kind !== 'plate' || !chef.held.dish) return 0;
      const recipe = recipeById(chef.held.dish);
      const orderIndex = orders.findIndex((order) => order.recipeId === chef.held.dish);
      let earned;
      if (orderIndex >= 0) {
        orders.splice(orderIndex, 1);
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        const multiplier = state.streak >= STREAK_TRIPLE_AT ? 3 : state.streak >= STREAK_DOUBLE_AT ? 2 : 1;
        earned = recipe.coins * multiplier;
        state.dishesServed += 1;
      } else {
        earned = UNORDERED_TIP;
      }
      state.coins += earned;
      state.score += earned * SCORE_PER_COIN + SCORE_PER_DISH;
      chef.held = null;
      return EVENT_SERVE;
    }
    if (stationId === 'trash') {
      if (!chef.held) return 0;
      chef.held = null;
      return EVENT_TRASH;
    }
    return 0;
  }

  /** Use the nearest station in reach (keyboard / Space). */
  function interact() {
    return interactAtStation(nearestStation(), null);
  }

  /**
   * Use the station under a mouse click, when the chef can reach it. A pantry
   * click picks that exact ingredient slot.
   */
  function interactAt(x, y) {
    for (const rect of STATION_RECTS) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        if (distanceToRect(chef.x, chef.y, rect) > CHEF.reach) return 0;
        return interactAtStation(rect.id, rect.id === 'pantry' ? x : null);
      }
    }
    return 0;
  }

  // Staging helpers for the screenshot scenes: they build states the real rules
  // can produce (an order that arrived earlier, with less patience left).
  function debugSpawnOrder(recipeId, patience) {
    if (orders.length >= MAX_ORDERS) return;
    orders.push({ recipeId, patience, max: ORDER_PATIENCE });
  }
  function debugSetPatience(index, seconds) {
    if (orders[index]) orders[index].patience = seconds;
  }

  reset();
  return { state, reset, step, interact, interactAt, nearestStation, debugSpawnOrder, debugSetPatience, pantrySlotAt };
}
