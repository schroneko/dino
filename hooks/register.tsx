import type { Register } from "claude-code";

const PANE = "dino";
const BEST = "best";

const toBest = (stored: unknown) => {
  const value = Number(stored);

  return Number.isFinite(value) ? value : 0;
};

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "dino",
      description: "Play the offline dinosaur game in a pane",
    });

    return next(e);
  });

  on("command.run", { command: "dino" }, async ($) => {
    await $.ui.open({ id: PANE, title: "Dino", focus: true, rows: 20 });

    return { text: "Dino opened. Click the game, then Space or Up to jump, Down to duck." };
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const best = toBest(await $.store.get(BEST));

    if (e.surface !== "terminal" && e.surface !== "desktop") {
      const { Text } = $.ui.resolve(e);

      return <Text dimColor>Dino runs in the terminal or the desktop app. Best: {best}</Text>;
    }

    const { Box, Client } = $.ui.resolve(e);

    return (
      <Box flexDirection="column">
        <Client key="game" module="./game.tsx" props={{ best }} height={19} width="100%" />
      </Box>
    );
  });

  on("ui.message", { requestId: PANE }, async ($, e) => {
    const data = e.data as { score?: unknown };
    const score = Number(data?.score);
    const best = toBest(await $.store.get(BEST));

    if (!Number.isFinite(score) || score <= best) {
      return { props: { best } };
    }

    await $.store.set(BEST, score);

    return { props: { best: score } };
  });
};
