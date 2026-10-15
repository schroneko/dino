import type { CommandRunInput, RenderPropsOf } from "claude-code";
import { expect, mock, test } from "claude-code/testing";

import { collides, newGame, pressDuck, pressJump, score, update } from "../hooks/game";

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 24,
  bodyColumns: 100,
} as unknown as RenderPropsOf["AbovePrompt"];

const RUN = { command: "dino", args: "" } as unknown as CommandRunInput;

const FRAME = 1000 / 60;

const fixed = () => 0.5;

test("a jump follows Chromium's arc and lands back on the ground", async () => {
  const game = newGame(400, fixed);
  pressJump(game, fixed);
  let top = game.trex.y;

  for (let i = 0; i < 120 && (i === 0 || game.trex.jumping); i += 1) {
    update(game, FRAME, fixed);
    top = Math.min(top, game.trex.y);
  }

  expect(game.trex.jumping).toBe(false);
  expect(game.trex.y).toBe(93);
  expect(top).toBeLessThan(30);
});

test("pressing down on the ground ducks, and in the air drops fast", async () => {
  const game = newGame(400, fixed);
  pressJump(game, fixed);
  update(game, FRAME, fixed);
  pressDuck(game);
  expect(game.trex.speedDrop).toBe(true);

  for (let i = 0; i < 60 && game.trex.jumping; i += 1) {
    update(game, FRAME, fixed);
  }

  pressDuck(game);
  expect(game.trex.ducking).toBe(true);
});

test("a cactus in the tyrannosaur's path ends the run", async () => {
  const game = newGame(400, fixed);
  pressJump(game, fixed);
  game.trex.jumping = false;
  game.trex.vy = 0;
  game.runningTime = 4000;
  game.obstacles = [
    {
      type: 0,
      x: 60,
      y: 105,
      size: 1,
      width: 17,
      gap: 500,
      speedOffset: 0,
      frame: 0,
      frameTimer: 0,
      followed: true,
    },
  ];

  expect(collides(game)).toBe(true);
  update(game, FRAME, fixed);
  expect(game.phase).toBe("crashed");
});

test("score counts distance as Chromium does", async () => {
  const game = newGame(400, fixed);
  pressJump(game, fixed);

  for (let i = 0; i < 60; i += 1) {
    update(game, FRAME, fixed);
  }

  expect(score(game)).toBe(Math.round(Math.ceil(game.distance) * 0.025));
  expect(score(game)).toBeGreaterThan(0);
});

test("/dino toggles the band above the prompt", async ($, on) => {
  mock.store(on);
  on("ui.render", { component: "AbovePrompt" }, ($, e) => {
    const { Text } = $.ui.resolve(e);

    return <Text key="engine">prompt</Text>;
  });

  const closed = await $.ui.mount({
    plugin: "dino",
    surface: "terminal",
    component: "AbovePrompt",
    props: BAND,
  });
  expect(await closed.find({ key: "game" })).toBeUndefined();
  await closed.unmount();

  await $.command.run(RUN);
  const opened = await $.ui.mount({
    plugin: "dino",
    surface: "terminal",
    component: "AbovePrompt",
    props: BAND,
  });
  expect(await opened.find({ key: "game" })).toBeDefined();
  await opened.unmount();

  await $.command.run(RUN);
  const again = await $.ui.mount({
    plugin: "dino",
    surface: "terminal",
    component: "AbovePrompt",
    props: BAND,
  });
  expect(await again.find({ key: "game" })).toBeUndefined();
  await again.unmount();
});

test("the terminal band runs the braille game and records a best score", async ($, on) => {
  mock.store(on);
  await $.command.run(RUN);

  const ui = await $.ui.mount({
    plugin: "dino",
    surface: "terminal",
    component: "AbovePrompt",
    props: BAND,
  });
  await ui.resize({ columns: 100, rows: 19 });
  expect(await ui.find({ type: "Text", text: /Press space to play/, in: "game" })).toBeDefined();

  await ui.key({ key: " " });
  await ui.advance(500);
  expect(await ui.find({ type: "Text", text: /Press space to play/, in: "game" })).toBeUndefined();

  await ui.post({ score: 42 });
  await ui.advance(50);
  expect(await ui.find({ type: "Text", text: /HI 00042/, in: "game" })).toBeDefined();
  await ui.unmount();
});

test("the desktop band draws the game as an SVG", async ($, on) => {
  mock.store(on);
  await $.command.run(RUN);

  const ui = await $.ui.mount({
    plugin: "dino",
    surface: "desktop",
    component: "AbovePrompt",
    props: BAND,
  });
  await ui.resize({ columns: 80, rows: 1 });
  await ui.advance(50);

  const drawing = await ui.find({ type: "Svg" });
  expect(drawing).toBeDefined();
  expect(String(drawing?.props.source)).toContain("Press space to play");

  await ui.key({ key: " " });
  await ui.advance(500);
  const running = await ui.find({ type: "Svg" });
  expect(String(running?.props.source)).not.toContain("Press space to play");
  await ui.unmount();
});
