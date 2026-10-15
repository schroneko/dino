import { atom, read, update } from "claude-code";
import type { Register } from "claude-code";

import { SVG_HEIGHT, SVG_WIDTH, svg } from "./game";
import type { Game } from "./game";

const BEST = "best";

const isOpen = atom({ plugin: "dino", key: "isOpen" } as const, false);
const snapshot = atom({ plugin: "dino", key: "snapshot" } as const, null);

const toBest = (stored: unknown) => {
  const value = Number(stored);

  return Number.isFinite(value) ? value : 0;
};

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "dino",
      description: "Show or hide the offline dinosaur game above the prompt",
    });

    return next(e);
  });

  on("command.run", { command: "dino" }, async ($) => {
    const open = !(await read($, isOpen));
    await update($, isOpen, () => open);

    if (!open) {
      await update($, snapshot, () => null);

      return { text: "Dino closed." };
    }

    return {
      text: "Dino is above the prompt. Click it, then Space or Up to jump, Down to duck. Run /dino again to close.",
    };
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isOpen))) {
      return next(e);
    }

    const best = toBest(await $.store.get(BEST));

    if (e.surface === "terminal") {
      const { Box, Client } = $.ui.resolve(e);

      return (
        <Box flexDirection="column">
          <Client
            key="game"
            module="./game.tsx"
            props={{ best, mode: "braille" }}
            height={19}
            width="100%"
          />
        </Box>
      );
    }

    if (e.surface === "desktop") {
      const { Box, Client, Svg } = $.ui.resolve(e);
      const game = await read($, snapshot);

      return (
        <Box flexDirection="column">
          {game && (
            <Svg
              source={svg(game as Game, best)}
              alt="Chrome offline dinosaur game"
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
            />
          )}
          <Client
            key="game"
            module="./game.tsx"
            props={{ best, mode: "svg" }}
            height={1}
            width="100%"
          />
        </Box>
      );
    }

    const { Text } = $.ui.resolve(e);

    return <Text dimColor>Dino runs in the terminal or the desktop app. Best: {best}</Text>;
  });

  on("ui.message", async ($, e) => {
    const data = (e.data ?? {}) as { frame?: Game; score?: unknown };

    if (data.frame) {
      const frame = data.frame;
      await update($, snapshot, () => frame);
    }

    if (data.score === undefined) {
      return {};
    }

    const score = Number(data.score);
    const best = toBest(await $.store.get(BEST));
    const mode = e.surface === "desktop" ? "svg" : "braille";

    if (!Number.isFinite(score) || score <= best) {
      return { props: { best, mode } };
    }

    await $.store.set(BEST, score);

    return { props: { best: score, mode } };
  });
};
