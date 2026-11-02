import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@spielestube/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@spielestube/woerterei": fileURLToPath(new URL("./packages/woerterei/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
  },
});
