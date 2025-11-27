import { defineConfig } from "vitest/config";

const match = process.version.match(/v(\d+)/);
const ge18 = match && parseInt(match[1], 10) >= 18;

export default defineConfig({
  test: {
    coverage: {
      include:  ["index.ts", ...(process.env.PARSER ? ["parser.ts"] : [])],
      provider: "v8"
    },
    environment: "node",
    globals:     true,
    ...(ge18 ? {} : { exclude: ["**/polyfill.test.ts"] })
  }
});
