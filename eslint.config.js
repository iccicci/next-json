import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";
import _import from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tsEslint from "typescript-eslint";

const rootDir = dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse
const tsconfigEslint = /** @type {{ include: string[] }} */ (JSON.parse(readFileSync(join(rootDir, "tsconfig.eslint.json"), "utf8")));

const overrides = { for: { after: false }, if: { after: false }, switch: { after: false }, while: { after: false } };
const unusedVarsOptions = { argsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true };

// Single source of truth for linted paths: tsconfig.eslint.json `include`
const typeCheckedFiles = tsconfigEslint.include;

export default defineConfig([
  {
    ignores: ["coverage/**", "dist/**", "parser.ts"]
  },
  {
    files:           ["eslint.config.js"],
    languageOptions: { globals: globals.node }
  },
  {
    extends:         [js.configs.recommended, ...tsEslint.configs.strictTypeChecked, ...tsEslint.configs.recommendedTypeChecked, ...tsEslint.configs.stylisticTypeChecked],
    files:           typeCheckedFiles,
    languageOptions: {
      ecmaVersion:   2020,
      globals:       globals.browser,
      parserOptions: {
        project:         ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: { "@stylistic": stylistic, import: _import, perfectionist, "simple-import-sort": simpleImportSort },
    rules:   {
      "@stylistic/keyword-spacing":                                ["error", { after: true, before: true, overrides }],
      "@stylistic/space-before-function-paren":                    ["error", { anonymous: "never", asyncArrow: "always", catch: "never", named: "never" }],
      "@typescript-eslint/consistent-type-definitions":            "off",
      "@typescript-eslint/no-confusing-void-expression":           "off",
      "@typescript-eslint/no-dynamic-delete":                      "off",
      "@typescript-eslint/no-empty-function":                      "off",
      "@typescript-eslint/no-empty-interface":                     "off",
      "@typescript-eslint/no-extraneous-class":                    "off",
      "@typescript-eslint/no-namespace":                           "off",
      "@typescript-eslint/no-non-null-assertion":                  "off",
      "@typescript-eslint/no-unused-vars":                         ["error", unusedVarsOptions],
      "@typescript-eslint/prefer-nullish-coalescing":              "off",
      "@typescript-eslint/prefer-regexp-exec":                     "off",
      "@typescript-eslint/restrict-template-expressions":          ["error", { allowNumber: true }],
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "arrow-body-style":                                          ["error", "as-needed"],
      "arrow-parens":                                              ["error", "as-needed"],
      "arrow-spacing":                                             "error",
      "brace-style":                                               ["error", "1tbs", { allowSingleLine: true }],
      curly:                                                       ["error", "multi"],
      eqeqeq:                                                      ["error"],
      "func-style":                                                ["error", "expression"],
      "import/first":                                              "error",
      "import/newline-after-import":                               "error",
      "import/no-duplicates":                                      "error",
      indent:                                                      ["error", 2],
      "key-spacing":                                               ["error", { align: { afterColon: true, beforeColon: false, on: "value" } }],
      "linebreak-style":                                           ["error", "unix"],
      "max-len":                                                   ["error", { code: 200, ignoreStrings: true }],
      "no-console":                                                "warn",
      "no-mixed-spaces-and-tabs":                                  ["error", "smart-tabs"],
      "no-restricted-globals":                                     ["error", "global", "process", "Buffer", "require", "module", "exports", "__dirname", "__filename"],
      "no-sparse-arrays":                                          "off",
      "perfectionist/sort-objects":                                ["error", { order: "asc", type: "alphabetical" }],
      "prefer-const":                                              ["error", { destructuring: "all" }],
      "prefer-template":                                           "error",
      quotes:                                                      ["error", "double", { avoidEscape: true }],
      semi:                                                        ["error", "always"],
      "simple-import-sort/exports":                                "error",
      "simple-import-sort/imports":                                "error",
      "space-unary-ops":                                           ["error", { nonwords: false, overrides: { "!": true }, words: true }]
    }
  }
]);
