import type { RenderPropsOf } from "claude-code";
import { expect, mock, test } from "claude-code/testing";

import { collides, newGame, pressDuck, pressJump, score, update } from "../hooks/game";

const PANE = {
  title: "Dino",
  isFocused: true,
  bodyColumns: 100,
  placement: "inline",
  scroll: { top: 0, bodyRows: 20 },
} as unknown as RenderPropsOf["Pane"];

const SURFACES = ["terminal", "desktop"] as const;

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

test("the pane starts, runs and records a best score", async ($, on) => {
  mock.store(on);

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: "dino",
      surface,
      component: "Pane",
      requestId: "dino",
      props: PANE,
    });
    await ui.resize({ columns: 100, rows: 19 });

    expect(await ui.find({ type: "Text", text: /Press space to play/, in: "game" })).toBeDefined();

    await ui.key({ key: " " });
    await ui.advance(500);
    expect(
      await ui.find({ type: "Text", text: /Press space to play/, in: "game" }),
    ).toBeUndefined();
    expect(await ui.find({ type: "Text", text: /\d{5}/, in: "game" })).toBeDefined();

    await ui.post({ score: 42 });
    await ui.advance(50);
    expect(await ui.find({ type: "Text", text: /HI 00042/, in: "game" })).toBeDefined();

    await ui.unmount();
  }
});
