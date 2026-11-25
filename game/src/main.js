// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and shift over. Tiny WebAudio blips (generated in code, no audio files) mark
// chopping, cooking, serving and strikes; M mutes them.
//
// ?seed=N fixes the order pattern. ?shot=start|play|rush|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, SHIFT_SECONDS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BURNT,
  EVENT_CHOP_DONE,
  EVENT_COOK_DONE,
  EVENT_DISH_READY,
  EVENT_OVER,
  EVENT_SERVE,
  EVENT_STRIKE,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

let muted = false;
let audio = null;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

/** One short oscillator blip; created lazily so no AudioContext exists before a gesture. */
function blip(frequency, seconds, delay = 0, type = 'sine') {
  if (muted) return;
  try {
    audio = audio ?? new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const start = audio.currentTime + delay;
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds);
  } catch {
    // Sound is garnish: a browser without audio still plays the game.
  }
}

function soundFor(events) {
  if (events & EVENT_SERVE) {
    blip(660, 0.12);
    blip(880, 0.16, 0.09);
  } else if (events & EVENT_DISH_READY) {
    blip(523, 0.12);
    blip(784, 0.2, 0.08);
  } else if (events & EVENT_CHOP_DONE) {
    blip(300, 0.08, 0, 'square');
  } else if (events & EVENT_COOK_DONE) {
    blip(980, 0.1);
  } else if (events & EVENT_BURNT) {
    blip(140, 0.25, 0, 'sawtooth');
  } else if (events & EVENT_STRIKE) {
    blip(180, 0.3, 0, 'sawtooth');
    blip(120, 0.35, 0.15, 'sawtooth');
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Cooking! ${SHIFT_SECONDS} second shift. Serve orders before their patience runs out.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Coins ${world.state.coins}. Dishes ${world.state.dishesServed}. Best score ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = !muted;
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & (ACTION_CONFIRM | ACTION_INTERACT)) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    const click = input.takeClick();
    if (click) {
      const events = world.interactAt(click.x, click.y);
      soundFor(events);
      return;
    }
    if (actions & ACTION_INTERACT) {
      const events = world.interact();
      soundFor(events);
      if (events & EVENT_SERVE) {
        announce(`Served! Coins ${world.state.coins}. Streak ${world.state.streak}.`);
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, 0, true);
      return;
    }
    const direction = input.direction();
    const events = world.step(STEP, direction.x, direction.y, false);
    soundFor(events);
    if (events & EVENT_STRIKE) announce(`Order expired! Strike ${world.state.strikes} of 3.`);
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve, Dapur Kilat. Press Space or click to start cooking.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
