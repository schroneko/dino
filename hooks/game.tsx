import type { ClientModule, ClientSurface } from "claude-code";

type Props = { best: number; mode: "braille" | "svg" };

type Rect = [number, number, number, number];

type Sprite = { width: number; height: number; dots: boolean[][] };

type ObstacleType = {
  width: number;
  height: number;
  yPos: number[];
  multipleSpeed: number;
  minGap: number;
  minSpeed: number;
  boxes: Rect[];
  speedOffset: number;
};

type Obstacle = {
  type: number;
  x: number;
  y: number;
  size: number;
  width: number;
  gap: number;
  speedOffset: number;
  frame: number;
  frameTimer: number;
  followed: boolean;
};

type Cloud = { x: number; y: number; gap: number };

type Star = { x: number; y: number };

type Trex = {
  y: number;
  vy: number;
  jumping: boolean;
  ducking: boolean;
  reachedMin: boolean;
  speedDrop: boolean;
  downUntil: number;
  animTimer: number;
  frame: number;
  blinkStart: number;
  blinkDelay: number;
};

type Achievement = { score: number; timer: number; iterations: number };

export type Game = {
  phase: "waiting" | "running" | "crashed";
  width: number;
  time: number;
  runningTime: number;
  speed: number;
  distance: number;
  trex: Trex;
  obstacles: Obstacle[];
  history: number[];
  clouds: Cloud[];
  groundX: number;
  night: boolean;
  invertTimer: number;
  moonX: number;
  stars: Star[];
  achievement: Achievement | null;
  crashedAt: number;
};

type State = { game: Game; frame: number };

type Rng = () => number;

const FPS = 60;
const MS_PER_FRAME = 1000 / FPS;
const HEIGHT = 150;
const BOTTOM_PAD = 10;
const SPEED = 6;
const MAX_SPEED = 13;
const ACCELERATION = 0.001;
const GAP_COEFFICIENT = 0.6;
const MAX_GAP_COEFFICIENT = 1.5;
const MAX_OBSTACLE_LENGTH = 3;
const MAX_OBSTACLE_DUPLICATION = 2;
const CLEAR_TIME = 3000;
const GAMEOVER_CLEAR_TIME = 750;
const BG_CLOUD_SPEED = 0.2;
const MAX_CLOUDS = 6;
const CLOUD_FREQUENCY = 0.5;
const MIN_CLOUD_GAP = 100;
const MAX_CLOUD_GAP = 400;
const MAX_SKY_LEVEL = 30;
const MIN_SKY_LEVEL = 71;
const CLOUD_WIDTH = 46;
const INVERT_DISTANCE = 700;
const INVERT_FADE_DURATION = 12000;
const MOON_SPEED = 0.25;
const STAR_SPEED = 0.3;
const STAR_MAX_Y = 70;
const ACHIEVEMENT_DISTANCE = 100;
const DISTANCE_COEFFICIENT = 0.025;
const FLASH_DURATION = 1000 / 4;
const FLASH_ITERATIONS = 3;
const MAX_DISTANCE_UNITS = 5;

const TREX_X = 50;
const TREX_WIDTH = 44;
const TREX_HEIGHT = 47;
const GRAVITY = 0.6;
const INITIAL_JUMP_VELOCITY = -10;
const MAX_JUMP_HEIGHT = 30;
const MIN_JUMP_HEIGHT = 30;
const DROP_VELOCITY = -5;
const SPEED_DROP_COEFFICIENT = 3;
const GROUND_Y = HEIGHT - TREX_HEIGHT - BOTTOM_PAD;
const MIN_JUMP_Y = GROUND_Y - MIN_JUMP_HEIGHT;
const RUN_MS_PER_FRAME = 1000 / 12;
const DUCK_MS_PER_FRAME = 1000 / 8;
const BLINK_TIMING = 7000;
const BLINK_LENGTH = 1000 / 6;
const KEY_HOLD_MS = 600;

const RUNNING_BOXES: Rect[] = [
  [22, 0, 17, 16],
  [1, 18, 30, 9],
  [10, 35, 14, 8],
  [1, 24, 29, 5],
  [5, 30, 21, 4],
  [9, 34, 15, 4],
];

const DUCKING_BOXES: Rect[] = [[1, 18, 55, 25]];

const PTERODACTYL = 2;

const TYPES: [ObstacleType, ObstacleType, ObstacleType] = [
  {
    width: 17,
    height: 35,
    yPos: [105],
    multipleSpeed: 4,
    minGap: 120,
    minSpeed: 0,
    boxes: [
      [0, 7, 5, 27],
      [4, 0, 6, 34],
      [10, 4, 7, 14],
    ],
    speedOffset: 0,
  },
  {
    width: 25,
    height: 50,
    yPos: [90],
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
    boxes: [
      [0, 12, 7, 38],
      [8, 0, 7, 49],
      [13, 10, 10, 38],
    ],
    speedOffset: 0,
  },
  {
    width: 46,
    height: 40,
    yPos: [100, 75, 50],
    multipleSpeed: 999,
    minGap: 150,
    minSpeed: 8.5,
    boxes: [
      [15, 15, 16, 5],
      [18, 21, 24, 6],
      [2, 14, 4, 3],
      [6, 10, 4, 7],
      [10, 8, 6, 9],
    ],
    speedOffset: 0.8,
  },
];

const sprite = (rows: string[]): Sprite => ({
  width: Math.max(...rows.map((row) => row.length)),
  height: rows.length,
  dots: rows.map((row) => [...row].map((ch) => ch === "#")),
});

const TREX_HEAD = [
  "............#########.",
  "...........##.########",
  "...........###########",
  "...........###########",
  "...........###########",
  "...........######.....",
  "...........#########..",
];

const TREX_HEAD_BLINK = [
  "............#########.",
  "...........###########",
  "...........###########",
  "...........###########",
  "...........###########",
  "...........######.....",
  "...........#########..",
];

const TREX_HEAD_CRASHED = [
  "............#########.",
  "...........##..#######",
  "...........##..#######",
  "...........###########",
  "...........#######....",
  "...........#####......",
  "...........########...",
];

const TREX_BODY = [
  "#.........#####.......",
  "#........########.....",
  "##......##########....",
  "###....#########.#....",
  "####..##########......",
  "################......",
  ".###############......",
  "..#############.......",
  "...###########........",
  "....#########.........",
  ".....#######..........",
];

const LEGS_STAND = [
  "......###.##..........",
  "......##....#.........",
  "......#.....#.........",
  "......##....##........",
];

const LEGS_RUN_1 = [
  "......###.##..........",
  "......##....##........",
  "......#...............",
  "......##..............",
];

const LEGS_RUN_2 = [
  "......###.##..........",
  "......###...#.........",
  "............#.........",
  "............##........",
];

const TREX_STANDING = sprite([...TREX_HEAD, ...TREX_BODY, ...LEGS_STAND]);
const TREX_BLINKING = sprite([...TREX_HEAD_BLINK, ...TREX_BODY, ...LEGS_STAND]);
const TREX_RUNNING = [
  sprite([...TREX_HEAD, ...TREX_BODY, ...LEGS_RUN_1]),
  sprite([...TREX_HEAD, ...TREX_BODY, ...LEGS_RUN_2]),
];
const TREX_CRASHED = sprite([...TREX_HEAD_CRASHED, ...TREX_BODY, ...LEGS_STAND]);

const DUCK_BODY = [
  "#......########.....#########.",
  "##...############..##.########",
  "###.##########################",
  "##############################",
  ".######################.......",
  "...##############..#######....",
  ".....########.##..............",
];

const TREX_DUCKING = [
  sprite([
    ...DUCK_BODY,
    ".....###..##..................",
    ".....##....#..................",
    ".....#.....##.................",
  ]),
  sprite([
    ...DUCK_BODY,
    ".....###..##..................",
    ".....###...#..................",
    "...........##.................",
  ]),
];

const CACTUS_SMALL = sprite([
  "...###...",
  "...###...",
  "#..###...",
  "#..###..#",
  "#..###..#",
  "#..###..#",
  "#..###..#",
  "##.###..#",
  ".#####.##",
  "...#####.",
  "...###...",
  "...###...",
  "...###...",
  "...###...",
  "...###...",
  "...###...",
  "...###...",
]);

const CACTUS_LARGE = sprite([
  ".....###.....",
  "....#####....",
  "....#####....",
  "....#####....",
  "##..#####....",
  "##..#####..##",
  "##..#####..##",
  "##..#####..##",
  "##..#####..##",
  "##..#####..##",
  "##..#####..##",
  "###.#####.###",
  ".###########.",
  "...#######...",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
  "....#####....",
]);

const PTERODACTYL_FRAMES = [
  sprite([
    "........#..............",
    "........##.............",
    "........###............",
    "........####...........",
    "....#...#####..........",
    "...##...######.........",
    "..###...#######........",
    ".##############........",
    "##################.....",
    "....###############....",
    "......##############...",
    "........########.......",
    "..........######.......",
  ]),
  sprite([
    ".......................",
    ".......................",
    ".......................",
    ".......................",
    "....#..................",
    "...##..................",
    "..###..................",
    ".#####.................",
    "##################.....",
    "....###############....",
    "......##############...",
    "........#######........",
    "........######.........",
    "........#####..........",
    "........####...........",
    "........###............",
    "........##.............",
    "........#..............",
  ]),
];

const CLOUD = sprite([
  "..........#####........",
  "........##.....##......",
  "....####.........###...",
  "..##................#..",
  ".#...................#.",
  "#.....................#",
  "#######################",
]);

const STAR = sprite([".#.", "###", ".#."]);

const MOON = (() => {
  const rows: string[] = [];

  for (let y = 0; y < 20; y += 1) {
    let row = "";

    for (let x = 0; x < 10; x += 1) {
      const outer = (x - 9.5) ** 2 + (y - 9.5) ** 2 <= 9.5 ** 2;
      const inner = (x - 13) ** 2 + (y - 9.5) ** 2 <= 8.5 ** 2;
      row += outer && !inner ? "#" : ".";
    }

    rows.push(row);
  }

  return sprite(rows);
})();

const RESTART = (() => {
  const rows: string[] = [];

  for (let y = 0; y < 16; y += 1) {
    let row = "";

    for (let x = 0; x < 18; x += 1) {
      const dx = x - 8.5;
      const dy = y - 8;
      const d = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const ring = d >= 5 && d <= 7.4 && !(angle > -1.4 && angle < -0.2);
      const head = y <= 6 && x >= 11 && x <= 17 && y >= 0 && x - 11 >= y - 1 && 17 - x >= 6 - y;
      row += ring || head ? "#" : ".";
    }

    rows.push(row);
  }

  return sprite(rows);
})();

const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

const newTrex = (time: number, rng: Rng): Trex => ({
  y: GROUND_Y,
  vy: 0,
  jumping: false,
  ducking: false,
  reachedMin: false,
  speedDrop: false,
  downUntil: 0,
  animTimer: 0,
  frame: 0,
  blinkStart: time,
  blinkDelay: Math.ceil(rng() * BLINK_TIMING),
});

export const newGame = (width: number, rng: Rng = Math.random): Game => ({
  phase: "waiting",
  width,
  time: 0,
  runningTime: 0,
  speed: SPEED,
  distance: 0,
  trex: newTrex(0, rng),
  obstacles: [],
  history: [],
  clouds: [],
  groundX: 0,
  night: false,
  invertTimer: 0,
  moonX: width - 50,
  stars: [],
  achievement: null,
  crashedAt: 0,
});

const restart = (game: Game, rng: Rng) => {
  game.phase = "running";
  game.runningTime = 0;
  game.speed = SPEED;
  game.distance = 0;
  game.trex = newTrex(game.time, rng);
  game.obstacles = [];
  game.history = [];
  game.groundX = 0;
  game.night = false;
  game.invertTimer = 0;
  game.achievement = null;
};

export const score = (game: Game) =>
  game.distance ? Math.round(Math.ceil(game.distance) * DISTANCE_COEFFICIENT) : 0;

const startJump = (game: Game) => {
  const trex = game.trex;

  if (trex.jumping) {
    return;
  }

  trex.vy = INITIAL_JUMP_VELOCITY - game.speed / 10;
  trex.jumping = true;
  trex.ducking = false;
  trex.reachedMin = false;
  trex.speedDrop = false;
};

export const pressJump = (game: Game, rng: Rng = Math.random) => {
  if (game.phase === "crashed") {
    if (game.time - game.crashedAt >= GAMEOVER_CLEAR_TIME) {
      restart(game, rng);
    }

    return;
  }

  if (game.phase === "waiting") {
    game.phase = "running";
  }

  if (!game.trex.ducking) {
    startJump(game);
  }
};

export const pressDuck = (game: Game) => {
  if (game.phase !== "running") {
    return;
  }

  const trex = game.trex;
  trex.downUntil = game.time + KEY_HOLD_MS;

  if (trex.jumping) {
    trex.speedDrop = true;
    trex.vy = 1;
  } else {
    trex.ducking = true;
  }
};

const updateJump = (game: Game, dt: number) => {
  const trex = game.trex;
  const frames = dt / MS_PER_FRAME;

  trex.y += Math.round(trex.vy * (trex.speedDrop ? SPEED_DROP_COEFFICIENT : 1) * frames);
  trex.vy += GRAVITY * frames;

  if (trex.y < MIN_JUMP_Y || trex.speedDrop) {
    trex.reachedMin = true;
  }

  if ((trex.y < MAX_JUMP_HEIGHT || trex.speedDrop) && trex.reachedMin && trex.vy < DROP_VELOCITY) {
    trex.vy = DROP_VELOCITY;
  }

  if (trex.y > GROUND_Y) {
    trex.y = GROUND_Y;
    trex.vy = 0;
    trex.jumping = false;
    trex.speedDrop = false;
    trex.reachedMin = false;
    trex.ducking = game.time < trex.downUntil;
  }
};

const isDuplicate = (history: number[], type: number) => {
  let count = 0;

  for (const seen of history) {
    count = seen === type ? count + 1 : 0;
  }

  return count >= MAX_OBSTACLE_DUPLICATION;
};

const addObstacle = (game: Game, rng: Rng) => {
  for (let tries = 0; tries < 100; tries += 1) {
    const index = randInt(rng, 0, TYPES.length - 1);
    const type = TYPES[index] ?? TYPES[0];

    if (isDuplicate(game.history, index) || game.speed < type.minSpeed) {
      continue;
    }

    let size = randInt(rng, 1, MAX_OBSTACLE_LENGTH);

    if (size > 1 && type.multipleSpeed > game.speed) {
      size = 1;
    }

    const width = type.width * size;
    const y = type.yPos[randInt(rng, 0, type.yPos.length - 1)] ?? type.yPos[0] ?? 0;
    const minGap = Math.round(width * game.speed + type.minGap * GAP_COEFFICIENT);
    const maxGap = Math.round(minGap * MAX_GAP_COEFFICIENT);
    const gap = randInt(rng, minGap, maxGap);
    const speedOffset = type.speedOffset ? (rng() > 0.5 ? type.speedOffset : -type.speedOffset) : 0;

    game.obstacles.push({
      type: index,
      x: game.width,
      y,
      size,
      width,
      gap,
      speedOffset,
      frame: 0,
      frameTimer: 0,
      followed: false,
    });
    game.history.unshift(index);

    if (game.history.length > 1) {
      game.history.splice(MAX_OBSTACLE_DUPLICATION);
    }

    return;
  }
};

const updateObstacles = (game: Game, dt: number, rng: Rng) => {
  for (const obstacle of game.obstacles) {
    if (obstacle.type === PTERODACTYL) {
      obstacle.frameTimer += dt;

      if (obstacle.frameTimer >= 1000 / 6) {
        obstacle.frame = obstacle.frame === 1 ? 0 : 1;
        obstacle.frameTimer = 0;
      }
    }

    obstacle.x -= Math.floor((((game.speed + obstacle.speedOffset) * FPS) / 1000) * dt);
  }

  game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);

  const last = game.obstacles[game.obstacles.length - 1];

  if (!last) {
    addObstacle(game, rng);
  } else if (!last.followed && last.x + last.width + last.gap < game.width) {
    addObstacle(game, rng);
    last.followed = true;
  }
};

const updateClouds = (game: Game, dt: number, rng: Rng) => {
  const cloudSpeed = Math.ceil((BG_CLOUD_SPEED / 1000) * dt * game.speed);
  const last = game.clouds[game.clouds.length - 1];

  for (const cloud of game.clouds) {
    cloud.x -= cloudSpeed;
  }

  game.clouds = game.clouds.filter((cloud) => cloud.x + CLOUD_WIDTH > 0);

  const shouldAdd =
    !last ||
    (game.clouds.length < MAX_CLOUDS && game.width - last.x > last.gap && CLOUD_FREQUENCY > rng());

  if (shouldAdd) {
    game.clouds.push({
      x: game.width,
      y: randInt(rng, MAX_SKY_LEVEL, MIN_SKY_LEVEL),
      gap: randInt(rng, MIN_CLOUD_GAP, MAX_CLOUD_GAP),
    });
  }
};

const overlaps = (a: Rect, b: Rect) =>
  a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[3] + a[1] > b[1];

export const collides = (game: Game) => {
  const obstacle = game.obstacles[0];

  if (!obstacle) {
    return false;
  }

  const type = TYPES[obstacle.type] ?? TYPES[0];
  const trexBox: Rect = [TREX_X + 1, game.trex.y + 1, TREX_WIDTH - 2, TREX_HEIGHT - 2];
  const obstacleBox: Rect = [
    obstacle.x + 1,
    obstacle.y + 1,
    type.width * obstacle.size - 2,
    type.height - 2,
  ];

  if (!overlaps(trexBox, obstacleBox)) {
    return false;
  }

  const boxes = type.boxes.map((box): Rect => [...box]);
  const [first, middle, end] = boxes;

  if (obstacle.size > 1 && first && middle && end) {
    middle[2] = obstacle.width - first[2] - end[2];
    end[0] = obstacle.width - end[2];
  }

  const trexBoxes = game.trex.ducking ? DUCKING_BOXES : RUNNING_BOXES;

  return trexBoxes.some((t) =>
    boxes.some((o) =>
      overlaps(
        [t[0] + trexBox[0], t[1] + trexBox[1], t[2], t[3]],
        [o[0] + obstacleBox[0], o[1] + obstacleBox[1], o[2], o[3]],
      ),
    ),
  );
};

const updateNight = (game: Game, dt: number, rng: Rng) => {
  if (game.invertTimer > INVERT_FADE_DURATION) {
    game.invertTimer = 0;
    game.night = false;
  } else if (game.invertTimer) {
    game.invertTimer += dt;
  } else {
    const distance = score(game);

    if (distance > 0 && distance % INVERT_DISTANCE === 0) {
      game.invertTimer += dt;
      game.night = true;
      game.moonX = game.width - 50;
      game.stars = Array.from({ length: 2 }, (_, i) => ({
        x: randInt(rng, (game.width / 2) * i, (game.width / 2) * (i + 1)),
        y: randInt(rng, 0, STAR_MAX_Y),
      }));
    }
  }

  if (game.night) {
    game.moonX = game.moonX < -20 ? game.width : game.moonX - MOON_SPEED;
    game.stars = game.stars.map((star) => ({
      ...star,
      x: star.x < -9 ? game.width : star.x - STAR_SPEED,
    }));
  }
};

const updateAchievement = (game: Game, dt: number) => {
  const current = game.achievement;

  if (!current) {
    const distance = score(game);

    if (distance > 0 && distance % ACHIEVEMENT_DISTANCE === 0) {
      game.achievement = { score: distance, timer: 0, iterations: 0 };
    }

    return;
  }

  if (current.iterations > FLASH_ITERATIONS) {
    game.achievement = null;

    return;
  }

  current.timer += dt;

  if (current.timer > FLASH_DURATION * 2) {
    current.timer = 0;
    current.iterations += 1;
  }
};

export const update = (game: Game, dt: number, rng: Rng = Math.random): boolean => {
  game.time += dt;
  const trex = game.trex;

  if (game.phase === "crashed") {
    return false;
  }

  if (game.phase === "waiting") {
    const wasBlinking = isBlinking(game);

    if (game.time - trex.blinkStart > trex.blinkDelay + BLINK_LENGTH) {
      trex.blinkStart = game.time;
      trex.blinkDelay = Math.ceil(rng() * BLINK_TIMING);
    }

    return wasBlinking !== isBlinking(game);
  }

  game.runningTime += dt;

  if (game.time >= trex.downUntil) {
    trex.ducking = false;
    trex.speedDrop = false;
  }

  if (trex.jumping) {
    updateJump(game, dt);
  }

  trex.animTimer += dt;

  if (trex.animTimer >= (trex.ducking ? DUCK_MS_PER_FRAME : RUN_MS_PER_FRAME)) {
    trex.frame = trex.frame === 1 ? 0 : 1;
    trex.animTimer = 0;
  }

  game.groundX += Math.floor(game.speed * (FPS / 1000) * dt);
  updateClouds(game, dt, rng);

  const hasObstacles = game.runningTime > CLEAR_TIME;

  if (hasObstacles) {
    updateObstacles(game, dt, rng);
  }

  if (hasObstacles && collides(game)) {
    game.phase = "crashed";
    game.crashedAt = game.time;

    return true;
  }

  game.distance += (game.speed * dt) / MS_PER_FRAME;

  if (game.speed < MAX_SPEED) {
    game.speed += ACCELERATION;
  }

  updateAchievement(game, dt);
  updateNight(game, dt, rng);

  return true;
};

const isBlinking = (game: Game) => {
  const since = game.time - game.trex.blinkStart;

  return since >= game.trex.blinkDelay && since < game.trex.blinkDelay + BLINK_LENGTH;
};

const ROWS = 19;
const DOT_ROWS = ROWS * 4;
const GROUND_DOT = 68;
const BRAILLE = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

const COLORS = {
  day: { bg: "#ffffff", main: "#535353", light: "#d6d6d6" },
  night: { bg: "#000000", main: "#acacac", light: "#3a3a3a" },
};

type Segment = { text: string; isLight: boolean };

type Label = { row: number; dotX: number; text: string; anchor: "start" | "middle" | "end" };

type Raster = { main: Uint8Array; light: Uint8Array; labels: Label[] };

export const SVG_WIDTH = 600;
export const SVG_HEIGHT = DOT_ROWS * 2;

const hash = (n: number) => (Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0) % 1009;

const pad = (n: number) =>
  String(Math.min(n, 10 ** MAX_DISTANCE_UNITS - 1)).padStart(MAX_DISTANCE_UNITS, "0");

const rasterize = (game: Game, dotWidth: number, best: number): Raster => {
  const main = new Uint8Array(dotWidth * DOT_ROWS);
  const light = new Uint8Array(dotWidth * DOT_ROWS);
  const labels: Label[] = [];

  const plot = (layer: Uint8Array, dx: number, dy: number) => {
    if (dx < 0 || dy < 0 || dx >= dotWidth || dy >= DOT_ROWS) {
      return;
    }

    layer[dy * dotWidth + dx] = 1;
  };

  const draw = (layer: Uint8Array, image: Sprite, leftPx: number, topDot: number) => {
    const left = Math.round(leftPx / 2);

    image.dots.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) {
          plot(layer, left + x, topDot + y);
        }
      }),
    );
  };

  if (game.night) {
    draw(main, MOON, game.moonX, 4);
    game.stars.forEach((star) => draw(main, STAR, star.x, Math.round(star.y / 2)));
  }

  game.clouds.forEach((cloud) => draw(light, CLOUD, cloud.x, Math.round(cloud.y / 2)));

  const offset = Math.floor(game.groundX / 2);

  for (let dx = 0; dx < dotWidth; dx += 1) {
    const h = hash(dx + offset);
    const isBump = h % 61 < 3;

    plot(main, dx, isBump ? GROUND_DOT - 1 : GROUND_DOT);

    if (h % 17 === 0) {
      plot(main, dx, GROUND_DOT + 2);
    }

    if (h % 23 === 0) {
      plot(main, dx, GROUND_DOT + 4);
    }
  }

  game.obstacles.forEach((obstacle) => {
    const type = TYPES[obstacle.type] ?? TYPES[0];

    if (obstacle.type === PTERODACTYL) {
      const image = PTERODACTYL_FRAMES[obstacle.frame] ?? CACTUS_SMALL;
      draw(main, image, obstacle.x, Math.round(obstacle.y / 2));

      return;
    }

    const image = obstacle.type === 1 ? CACTUS_LARGE : CACTUS_SMALL;
    const bottom = Math.round((obstacle.y + type.height) / 2);

    for (let i = 0; i < obstacle.size; i += 1) {
      draw(main, image, obstacle.x + i * type.width, bottom - image.height);
    }
  });

  const trex = game.trex;
  const image =
    game.phase === "crashed"
      ? TREX_CRASHED
      : game.phase === "waiting"
        ? isBlinking(game)
          ? TREX_BLINKING
          : TREX_STANDING
        : trex.ducking
          ? (TREX_DUCKING[trex.frame] ?? TREX_STANDING)
          : trex.jumping
            ? TREX_STANDING
            : (TREX_RUNNING[trex.frame] ?? TREX_STANDING);
  draw(main, image, TREX_X, Math.round((trex.y + TREX_HEIGHT) / 2) - image.height);

  const now = score(game);
  const achievement = game.achievement;
  const isHidden = achievement !== null && achievement.timer < FLASH_DURATION;
  const shown = achievement ? achievement.score : now;
  const current = isHidden ? " ".repeat(MAX_DISTANCE_UNITS) : pad(shown);
  const scoreText = best > 0 ? `HI ${pad(best)}  ${current}` : current;
  labels.push({ row: 0, dotX: dotWidth - 2, text: scoreText, anchor: "end" });

  if (game.phase === "crashed") {
    labels.push({ row: 5, dotX: dotWidth / 2, text: "G A M E   O V E R", anchor: "middle" });
    draw(main, RESTART, game.width / 2 - 18, Math.round((HEIGHT / 2 - 16) / 2) + 6);
  }

  if (game.phase === "waiting") {
    labels.push({ row: 2, dotX: 4, text: "Press space to play", anchor: "start" });
  }

  return { main, light, labels };
};

export const frame = (game: Game, columns: number, best: number): Segment[][] => {
  const dotWidth = columns * 2;
  const { main, light, labels } = rasterize(game, dotWidth, best);
  const overlay = new Map<number, string>();

  labels.forEach((label) => {
    const center = label.dotX / 2;
    const start =
      label.anchor === "end"
        ? Math.floor(center) - label.text.length
        : label.anchor === "middle"
          ? Math.floor(center - label.text.length / 2)
          : Math.floor(center);

    [...label.text].forEach((ch, i) => {
      const col = start + i;

      if (col >= 0 && col < columns) {
        overlay.set(label.row * columns + col, ch);
      }
    });
  });

  const bitsOf = (layer: Uint8Array, r: number, c: number) => {
    let bits = 0;

    for (let dy = 0; dy < 4; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        if (layer[(r * 4 + dy) * dotWidth + c * 2 + dx]) {
          bits |= BRAILLE[dy]?.[dx] ?? 0;
        }
      }
    }

    return bits;
  };

  const rows: Segment[][] = [];

  for (let r = 0; r < ROWS; r += 1) {
    const segments: Segment[] = [];

    for (let c = 0; c < columns; c += 1) {
      const cell = r * columns + c;
      const mainBits = bitsOf(main, r, c);
      const lightBits = bitsOf(light, r, c);
      const overlayChar = overlay.get(cell);
      const ch = overlayChar ?? String.fromCharCode(0x2800 + (mainBits | lightBits));
      const isLight = overlayChar === undefined && mainBits === 0 && lightBits !== 0;
      const lastSegment = segments[segments.length - 1];

      if (lastSegment && lastSegment.isLight === isLight) {
        lastSegment.text += ch;
      } else {
        segments.push({ text: ch, isLight });
      }
    }

    rows.push(segments);
  }

  return rows;
};

const runs = (layer: Uint8Array, dotWidth: number) => {
  let d = "";

  for (let y = 0; y < DOT_ROWS; y += 1) {
    let x = 0;

    while (x < dotWidth) {
      if (!layer[y * dotWidth + x]) {
        x += 1;
        continue;
      }

      const start = x;

      while (x < dotWidth && layer[y * dotWidth + x]) {
        x += 1;
      }

      const w = (x - start) * 2;
      d += `M${start * 2} ${y * 2}h${w}v2h-${w}z`;
    }
  }

  return d;
};

export const svg = (game: Game, best: number) => {
  const dotWidth = SVG_WIDTH / 2;
  const { main, light, labels } = rasterize(game, dotWidth, best);
  const colors = game.night ? COLORS.night : COLORS.day;
  const texts = labels
    .map(
      (label) =>
        `<text x="${label.dotX * 2}" y="${label.row * 8 + 11}" text-anchor="${label.anchor}" xml:space="preserve">${label.text}</text>`,
    )
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" shape-rendering="crispEdges">`,
    `<rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${colors.bg}"/>`,
    `<path fill="${colors.light}" d="${runs(light, dotWidth)}"/>`,
    `<path fill="${colors.main}" d="${runs(main, dotWidth)}"/>`,
    `<g fill="${colors.main}" font-family="ui-monospace, Menlo, monospace" font-size="12" letter-spacing="1">${texts}</g>`,
    `</svg>`,
  ].join("");
};

const TICK_MS = 33;
const STEPS_PER_TICK = 2;
const MIN_COLUMNS = 40;
const MAX_COLUMNS = 150;

const columnsOf = (surface: ClientSurface<State>) =>
  Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, surface.columns || 100));

const DinoGame: ClientModule<Props, State> = (props, surface: ClientSurface<State>) => {
  const { Box, Text } = surface.elements;
  const columns = columnsOf(surface);
  const isSvg = props.mode === "svg";

  if (surface.state === undefined) {
    const widthOf = () => (isSvg ? SVG_WIDTH : columnsOf(surface) * 4);
    let current: State = { game: newGame(widthOf()), frame: 0 };
    let posted = false;

    const commit = () => {
      const game = current.game;
      const isNewCrash = game.phase === "crashed" && !posted;

      if (isNewCrash) {
        posted = true;
      }

      if (game.phase !== "crashed") {
        posted = false;
      }

      if (isSvg) {
        surface.post(isNewCrash ? { frame: game, score: score(game) } : { frame: game });
      } else if (isNewCrash) {
        surface.post({ score: score(game) });
      }

      current = { game, frame: current.frame + 1 };
      surface.setState(current);
    };

    surface.every(TICK_MS, () => {
      const game = current.game;
      const width = widthOf();
      let changed = game.width !== width;
      game.width = width;

      for (let i = 0; i < STEPS_PER_TICK; i += 1) {
        changed = update(game, MS_PER_FRAME) || changed;
      }

      if (changed) {
        commit();
      }
    });

    surface.onKey((event) => {
      if (event.key === " " || event.key === "up" || event.key === "return" || event.key === "w") {
        pressJump(current.game);
        commit();
      }

      if (event.key === "down" || event.key === "s") {
        pressDuck(current.game);
        commit();
      }
    });

    surface.onPointer((event) => {
      if (event.type === "down") {
        pressJump(current.game);
        commit();
      }
    });

    if (isSvg) {
      surface.post({ frame: current.game });
    }

    surface.setState(current);
  }

  const game = surface.state?.game ?? newGame(columns * 4);
  const best = Math.max(props.best ?? 0, game.phase === "crashed" ? score(game) : 0);
  const colors = game.night ? COLORS.night : COLORS.day;

  if (isSvg) {
    return (
      <Text dimColor wrap="truncate">
        {game.phase === "running"
          ? "Space / Up: jump   Down: duck   /dino: close"
          : "Click this line, then press Space to play   /dino: close"}
      </Text>
    );
  }

  return (
    <Box flexDirection="column" width={columns}>
      {frame(game, columns, best).map((segments) => (
        <Text backgroundColor={colors.bg} wrap="truncate">
          {segments.map((segment) => (
            <Text color={segment.isLight ? colors.light : colors.main}>{segment.text}</Text>
          ))}
        </Text>
      ))}
    </Box>
  );
};

export default DinoGame;
