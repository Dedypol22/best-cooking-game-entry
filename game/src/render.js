// All canvas drawing: the warung kitchen floor and walls, the stations with their
// labels, the order board with tickets and patience bars, the counters with their
// ingredients, the chef, the held item, plating progress, the timer and the coin and
// streak HUD, and the title, pause and results screens. Drawn so the game reads at
// thumbnail size: large labels, high contrast, food drawn with canvas shapes.
import {
  CHEF,
  FIELD,
  FONT,
  INGREDIENTS,
  MAX_STRIKES,
  PALETTE,
  PANTRY_ORDER,
  POT_SLOT,
  STATIONS,
  STOVE_BURNERS,
  recipeById,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const BOARD_TOP = 128;

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, weight = 'bold', align = 'left') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/** One ingredient drawn as food, at (x, y) with radius r, in its current state. */
export function drawIngredient(ctx, ing, state, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#241d18';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3a2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.3);
    ctx.lineTo(r * 0.4, r * 0.2);
    ctx.moveTo(-r * 0.4, r * 0.4);
    ctx.lineTo(r * 0.5, -r * 0.4);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (ing === 'rice') {
    ctx.fillStyle = state === 'cooked' ? '#f0d9a0' : '#f5efe0';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = state === 'cooked' ? '#d9b96a' : '#ddd2b8';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(-r * 0.55 + i * r * 0.28, -r * 0.15 + (i % 2) * r * 0.2, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'noodle') {
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -r * 0.4 + i * r * 0.4, r * 0.55, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else if (ing === 'egg') {
    if (state === 'chopped') {
      ctx.fillStyle = '#fdf6d8';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.5 + i * r * 0.5, (i % 2) * r * 0.3 - r * 0.1, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f2b705';
      ctx.beginPath();
      ctx.arc(r * 0.2, -r * 0.2, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = state === 'cooked' ? '#f7ead0' : '#fdf6d8';
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state === 'cooked' ? '#e8960c' : '#f2b705';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'chicken') {
    if (state === 'chopped') {
      ctx.fillStyle = state === 'cooked' ? '#c97b2e' : '#e8a06a';
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(-r * 0.6 + i * r * 0.45, -r * 0.25 + (i % 2) * r * 0.35, r * 0.38, r * 0.38);
      }
    } else {
      ctx.fillStyle = state === 'cooked' ? '#b96a1e' : '#e8a06a';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.85, r * 0.6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5efe0';
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.moveTo(r * 0.6, -r * 0.35);
      ctx.lineTo(r * 1.05, -r * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#f5efe0';
      ctx.beginPath();
      ctx.arc(r * 1.1, -r * 0.75, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'tomato') {
    if (state === 'chopped') {
      ctx.fillStyle = '#d94f3d';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.7 + i * r * 0.6, r * 0.5);
        ctx.arc(-r * 0.4 + i * r * 0.6, r * 0.1, r * 0.42, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#d94f3d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7fb069';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(-r * 0.35, -r * 1.05);
      ctx.lineTo(r * 0.35, -r * 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'chilli') {
    if (state === 'chopped') {
      ctx.strokeStyle = '#c62f2f';
      ctx.lineWidth = r * 0.28;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.5 + i * r * 0.5, (i % 2) * r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#7fb069';
      ctx.beginPath();
      ctx.arc(r * 0.5, -r * 0.4, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#c62f2f';
      ctx.lineWidth = r * 0.42;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -r * 0.2, r * 0.7, Math.PI * 1.15, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = '#7fb069';
      ctx.lineWidth = r * 0.2;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.85);
      ctx.lineTo(r * 0.85, -r * 1.05);
      ctx.stroke();
    }
  }
  if (state === 'cooked') {
    // Steam wisps over a just-cooked ingredient.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.3 + i * r * 0.6, -r * 0.9);
      ctx.quadraticCurveTo(-r * 0.1 + i * r * 0.6, -r * 1.25, -r * 0.3 + i * r * 0.6, -r * 1.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPlate(ctx, plate, x, y) {
  ctx.fillStyle = '#f8f4ea';
  ctx.beginPath();
  ctx.ellipse(x, y, 52, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9bda6';
  ctx.lineWidth = 2;
  ctx.stroke();
  plate.items.forEach((item, index) => {
    const angle = (index / Math.max(1, plate.items.length)) * Math.PI * 2 - Math.PI / 2;
    drawIngredient(ctx, item.ing, item.state, x + Math.cos(angle) * 24, y + Math.sin(angle) * 12, 13);
  });
  if (plate.dish) {
    const recipe = recipeById(plate.dish);
    ctx.fillStyle = PALETTE.good;
    roundRect(ctx, x - 78, y - 52, 156, 26, 13);
    ctx.fill();
    text(ctx, `${recipe.name.toUpperCase()} — READY!`, x, y - 34, 14, '#ffffff', 'bold', 'center');
  } else if (plate.mush) {
    ctx.fillStyle = PALETTE.danger;
    roundRect(ctx, x - 78, y - 52, 156, 26, 13);
    ctx.fill();
    text(ctx, 'MYSTERY MUSH!', x, y - 34, 14, '#ffffff', 'bold', 'center');
  } else if (plate.items.length > 0) {
    // Above the plate, not below it: below sits on the same row as the
    // counter's own label and the two texts crowd each other.
    text(ctx, `${plate.items.length} on plate…`, x, y - 44, 13, '#ffe9c4', 'bold', 'center');
  }
}

function drawProgressBar(ctx, x, y, width, fraction, colour) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x, y, width, 10, 5);
  ctx.fill();
  ctx.fillStyle = colour;
  roundRect(ctx, x, y, Math.max(10, width * fraction), 10, 5);
  ctx.fill();
}

function drawCounter(ctx, rect, topColour, edgeColour) {
  ctx.fillStyle = edgeColour;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
  ctx.fill();
  ctx.fillStyle = topColour;
  roundRect(ctx, rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 14, 8);
  ctx.fill();
  text(ctx, rect.label, rect.x + rect.width / 2, rect.y + rect.height - 4, 13, '#fff7e8', 'bold', 'center');
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function drawFloor() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, BOARD_TOP);
    ctx.fillStyle = PALETTE.wallDark;
    ctx.fillRect(0, BOARD_TOP - 10, FIELD.width, 10);
    const tile = 64;
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 20; col += 1) {
        ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(col * tile, BOARD_TOP + row * tile, tile, tile);
      }
    }
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 2;
    for (let row = 0; row <= 9; row += 1) {
      ctx.beginPath();
      ctx.moveTo(0, BOARD_TOP + row * tile);
      ctx.lineTo(FIELD.width, BOARD_TOP + row * tile);
      ctx.stroke();
    }
    for (let col = 0; col <= 20; col += 1) {
      ctx.beginPath();
      ctx.moveTo(col * tile, BOARD_TOP);
      ctx.lineTo(col * tile, FIELD.height);
      ctx.stroke();
    }
    // A worn round rug in the middle of the floor, where the chef works.
    ctx.fillStyle = '#a8643c';
    ctx.beginPath();
    ctx.ellipse(640, 430, 190, 64, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a4f2c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(640, 430, 168, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    // A smaller runner rug in front of the serving window, and worn, darker
    // tiles along the two corridors the chef runs (x=300 left, x=950 right):
    // the empty middle of the floor reads as a worked kitchen, not bare tiles.
    ctx.fillStyle = '#9c5a35';
    ctx.beginPath();
    ctx.ellipse(690, 268, 120, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7e4527';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(690, 268, 104, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120, 70, 35, 0.28)';
    for (const corridorX of [300, 950]) {
      for (let row = 0; row < 9; row += 2) {
        ctx.fillRect(corridorX - 32, BOARD_TOP + row * tile, tile, tile);
      }
    }
    // A skirting strip finishes the floor's bottom edge.
    ctx.fillStyle = PALETTE.wallDark;
    ctx.fillRect(0, FIELD.height - 16, FIELD.width, 16);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(0, FIELD.height - 16, FIELD.width, 3);
  }

  function drawPantry() {
    const rect = STATIONS.pantry;
    drawCounter(ctx, rect, PALETTE.counterTop, PALETTE.counterEdge);
    const slotWidth = rect.width / PANTRY_ORDER.length;
    PANTRY_ORDER.forEach((ing, index) => {
      const cx = rect.x + slotWidth * (index + 0.5);
      const cy = rect.y + 34;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      roundRect(ctx, cx - 17, cy - 26, 34, 52, 8);
      ctx.fill();
      drawIngredient(ctx, ing, 'raw', cx, cy, 12);
      text(ctx, INGREDIENTS[ing].label, cx, rect.y + 66, 10, '#fff7e8', 'bold', 'center');
    });
  }

  function drawChopBoard(state) {
    const rect = STATIONS.board;
    ctx.fillStyle = PALETTE.boardEdge;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 18, 8);
    ctx.fill();
    text(ctx, rect.label, rect.x + rect.width / 2, rect.y + rect.height - 4, 13, '#fff7e8', 'bold', 'center');
    if (state.board.item) {
      drawIngredient(ctx, state.board.item.ing, state.board.item.state, rect.x + 70, rect.y + 32, 20);
      if (state.board.item.state === 'raw') {
        ctx.strokeStyle = PALETTE.accent;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(rect.x + 70, rect.y + 32, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.board.progress);
        ctx.stroke();
        text(ctx, 'CHOPPING…', rect.x + 150, rect.y + 36, 12, PALETTE.ticketInk, 'bold', 'center');
      } else {
        text(ctx, 'CHOPPED', rect.x + 150, rect.y + 36, 12, PALETTE.ticketInk, 'bold', 'center');
      }
    } else {
      text(ctx, 'bring something to chop', rect.x + rect.width / 2, rect.y + 38, 12, '#8a7a5c', 'bold', 'center');
    }
  }

  function drawStove(state) {
    const rect = STATIONS.stove;
    ctx.fillStyle = '#3a3f46';
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
    ctx.fill();
    ctx.fillStyle = '#565e66';
    roundRect(ctx, rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 14, 8);
    ctx.fill();
    text(ctx, rect.label, rect.x + rect.width / 2, rect.y + rect.height - 4, 13, '#fff7e8', 'bold', 'center');
    STOVE_BURNERS.forEach((burner, index) => {
      const slot = state.stove[index];
      ctx.fillStyle = '#22262b';
      ctx.beginPath();
      ctx.arc(burner.x, burner.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7d8891';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (slot.item) {
        if (slot.item.state !== 'cooked' && slot.item.state !== 'burnt') {
          ctx.fillStyle = '#ff8c1a';
          ctx.beginPath();
          ctx.moveTo(burner.x - 18, burner.y + 26);
          ctx.lineTo(burner.x - 8, burner.y + 8);
          ctx.lineTo(burner.x, burner.y + 24);
          ctx.lineTo(burner.x + 8, burner.y + 8);
          ctx.lineTo(burner.x + 18, burner.y + 26);
          ctx.closePath();
          ctx.fill();
        }
        drawIngredient(ctx, slot.item.ing, slot.item.state, burner.x, burner.y - 4, 18);
        const fraction = slot.item.state === 'cooked' || slot.item.state === 'burnt' ? 1 : slot.progress;
        drawProgressBar(ctx, burner.x - 30, burner.y + 26, 60, fraction, slot.item.state === 'burnt' ? PALETTE.danger : PALETTE.accent);
        if (slot.item.state === 'burnt') text(ctx, 'BURNT!', burner.x, burner.y - 34, 12, PALETTE.danger, 'bold', 'center');
        else if (slot.item.state === 'cooked') text(ctx, 'DONE', burner.x, burner.y - 34, 12, PALETTE.good, 'bold', 'center');
      }
    });
  }

  function drawPot(state) {
    const rect = STATIONS.pot;
    drawCounter(ctx, rect, PALETTE.counterTop, PALETTE.counterEdge);
    ctx.fillStyle = PALETTE.steel;
    ctx.beginPath();
    ctx.ellipse(POT_SLOT.x, POT_SLOT.y, 52, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b7a8c';
    ctx.beginPath();
    ctx.ellipse(POT_SLOT.x, POT_SLOT.y, 44, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state.pot.item) {
      drawIngredient(ctx, state.pot.item.ing, state.pot.item.state, POT_SLOT.x, POT_SLOT.y - 6, 15);
      const fraction = state.pot.item.state === 'cooked' || state.pot.item.state === 'burnt' ? 1 : state.pot.progress;
      drawProgressBar(ctx, POT_SLOT.x - 40, POT_SLOT.y + 24, 80, fraction, state.pot.item.state === 'burnt' ? PALETTE.danger : '#7fd4ff');
      if (state.pot.item.state === 'burnt') text(ctx, 'BURNT!', POT_SLOT.x, POT_SLOT.y - 32, 12, PALETTE.danger, 'bold', 'center');
      else if (state.pot.item.state === 'cooked') text(ctx, 'DONE', POT_SLOT.x, POT_SLOT.y - 32, 12, PALETTE.good, 'bold', 'center');
    } else {
      text(ctx, 'boil here', POT_SLOT.x, POT_SLOT.y + 2, 12, '#dce8ec', 'bold', 'center');
    }
  }

  function drawWindow() {
    const rect = STATIONS.window;
    ctx.fillStyle = '#2c1e12';
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
    ctx.fill();
    ctx.fillStyle = '#f7ead0';
    roundRect(ctx, rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 22, 8);
    ctx.fill();
    text(ctx, 'SERVE HERE', rect.x + rect.width / 2, rect.y + 34, 16, '#7a4a1e', 'bold', 'center');
    text(ctx, rect.label, rect.x + rect.width / 2, rect.y + rect.height - 4, 13, '#fff7e8', 'bold', 'center');
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(rect.x + rect.width - 26, rect.y + 30, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(rect.x + rect.width - 28, rect.y + 26, 4, 8);
  }

  function drawPlating(state) {
    const rect = STATIONS.plating;
    drawCounter(ctx, rect, PALETTE.counterTop, PALETTE.counterEdge);
    if (state.plates.length === 0) {
      text(ctx, 'assemble dishes here', rect.x + rect.width / 2, rect.y + 40, 13, '#ffe9c4', 'bold', 'center');
    }
    state.plates.forEach((plate, index) => {
      const x = rect.x + 90 + index * 160;
      drawPlate(ctx, plate, x, rect.y + 42);
    });
  }

  function drawTrash(state) {
    const rect = STATIONS.trash;
    ctx.fillStyle = '#4a4f55';
    roundRect(ctx, rect.x + 30, rect.y + 8, 70, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#6a7076';
    roundRect(ctx, rect.x + 24, rect.y + 2, 82, 12, 6);
    ctx.fill();
    text(ctx, rect.label, rect.x + rect.width / 2, rect.y + rect.height - 4, 13, '#fff7e8', 'bold', 'center');
    if (state.chef.held) text(ctx, 'drop it here', rect.x + rect.width / 2, rect.y + 78, 11, PALETTE.muted, 'bold', 'center');
  }

  function drawChef(state) {
    const chef = state.chef;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 16, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: white apron over a teal shirt.
    ctx.fillStyle = '#0f5257';
    roundRect(ctx, chef.x - 16, chef.y - 6, 32, 26, 10);
    ctx.fill();
    ctx.fillStyle = '#f8f4ea';
    roundRect(ctx, chef.x - 11, chef.y - 2, 22, 20, 6);
    ctx.fill();
    // Head and chef's hat.
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(chef.x, chef.y - 14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(chef.x - 8, chef.y - 24, 8, 0, Math.PI * 2);
    ctx.arc(chef.x, chef.y - 28, 9, 0, Math.PI * 2);
    ctx.arc(chef.x + 8, chef.y - 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(chef.x - 13, chef.y - 26, 26, 6);
    if (chef.held) {
      const held = chef.held;
      if (held.kind === 'plate') {
        drawPlate(ctx, held, chef.x, chef.y - 52);
      } else {
        drawIngredient(ctx, held.ing, held.state, chef.x, chef.y - 46, 15);
        text(ctx, INGREDIENTS[held.ing].label, chef.x, chef.y - 66, 11, PALETTE.text, 'bold', 'center');
      }
    }
  }

  function drawBoard(state) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, BOARD_TOP);
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.fillRect(0, BOARD_TOP - 6, FIELD.width, 6);
    text(ctx, 'ORDERS', 18, 26, 15, PALETTE.accent, 'bold');
    state.orders.forEach((order, index) => {
      const recipe = recipeById(order.recipeId);
      const x = 16 + index * 208;
      const y = 34;
      ctx.fillStyle = PALETTE.ticket;
      roundRect(ctx, x, y, 196, 82, 10);
      ctx.fill();
      const fraction = Math.max(0, order.patience / order.max);
      const barColour = fraction > 0.5 ? PALETTE.good : fraction > 0.25 ? PALETTE.accent : PALETTE.danger;
      text(ctx, recipe.name.toUpperCase(), x + 10, y + 22, 15, PALETTE.ticketInk, 'bold');
      recipe.components.forEach((component, cIndex) => {
        const dotX = x + 18 + cIndex * 26;
        ctx.fillStyle = INGREDIENTS[component.ing].colour;
        ctx.beginPath();
        ctx.arc(dotX, y + 44, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      text(ctx, `Rp ${recipe.coins}k`, x + 186, y + 48, 13, PALETTE.ticketInk, 'bold', 'right');
      drawProgressBar(ctx, x + 10, y + 62, 176, fraction, barColour);
    });
    if (state.orders.length === 0) {
      text(ctx, 'no orders — breathe!', 20, 80, 15, PALETTE.muted, 'bold');
    }
    // HUD: timer, coins, streak, strikes.
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const timerText = `${minutes}:${String(seconds).padStart(2, '0')}`;
    const timerColour = state.timeLeft <= 30 ? PALETTE.danger : PALETTE.text;
    text(ctx, 'SHIFT', 1150, 54, 13, PALETTE.muted, 'bold', 'right');
    text(ctx, timerText, 1262, 56, 44, timerColour, 'bold', 'right');
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(1010, 78, 11, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'Rp', 1010, 82, 11, '#7a4a1e', 'bold', 'center');
    text(ctx, `${state.coins}k`, 1028, 84, 20, PALETTE.text, 'bold');
    const multiplier = state.streak >= 5 ? 'x3' : state.streak >= 3 ? 'x2' : '';
    text(ctx, multiplier ? `STREAK ${state.streak}  ${multiplier}` : `STREAK ${state.streak}`, 1010, 112, 15, multiplier ? PALETTE.accent : PALETTE.muted, 'bold', 'right');
    for (let i = 0; i < MAX_STRIKES; i += 1) {
      const x = 1140 + i * 26;
      const y = 100;
      ctx.strokeStyle = i < state.strikes ? PALETTE.danger : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 7);
      ctx.lineTo(x + 7, y + 7);
      ctx.moveTo(x + 7, y - 7);
      ctx.lineTo(x - 7, y + 7);
      ctx.stroke();
    }
    text(ctx, 'STRIKES', 1130, 86, 11, PALETTE.muted, 'bold');
  }

  function drawPanel(title, lines, foot) {
    ctx.fillStyle = 'rgba(6, 30, 28, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.ticket;
    roundRect(ctx, 340, 150, 600, 420, 18);
    ctx.fill();
    text(ctx, title, 640, 220, 44, PALETTE.ticketInk, 'bold', 'center');
    lines.forEach((line, index) => {
      text(ctx, line, 640, 280 + index * 34, 19, '#5a4632', 'bold', 'center');
    });
    if (foot) text(ctx, foot, 640, 520, 20, PALETTE.danger, 'bold', 'center');
  }

  function draw(state, screen, best) {
    drawFloor();
    drawPantry();
    drawChopBoard(state);
    drawPot(state);
    drawStove(state);
    drawWindow();
    drawPlating(state);
    drawTrash(state);
    drawBoard(state);
    drawChef(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('SIZZLE & SERVE', [
        'Dapur Kilat — a warung kitchen rush',
        'WASD / arrows to move · Space or E to grab & use',
        'Click a station to use it · P pauses · M mutes',
        'Chop, fry or boil, plate the dish, serve it',
        'before its patience runs out. 3 strikes ends the shift.',
        `Best score: ${best}`,
      ], 'Press Space to start cooking');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The stove is off. The orders wait.', 'Take a breath, chef.'], 'Press P to get back to it');
    } else if (screen === SCREEN_OVER) {
      const reason = state.overReason === 'strikes' ? 'Three strikes — the customers walked out.' : 'The shift is over — the kitchen closes.';
      drawPanel('SHIFT OVER!', [
        reason,
        `Coins earned: Rp ${state.coins}k`,
        `Dishes served: ${state.dishesServed}   Best streak: ${state.bestStreak}`,
        `Score: ${state.score}   Best: ${Math.max(best, state.score)}`,
      ], 'Press Space to cook again');
    }
  }

  return { draw };
}
