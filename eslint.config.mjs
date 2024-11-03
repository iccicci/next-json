import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import _import from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sortKeys from "eslint-plugin-sort-keys";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ allConfig: js.configs.all, baseDirectory: __dirname, recommendedConfig: js.configs.recommended });

export default [
  ...compat.extends("plugin:@typescript-eslint/recommended"),
  {
    languageOptions: { ecmaVersion: 9, globals: { ...globals.amd, ...globals.browser, ...globals.jquery, ...globals.node }, parser: tsParser, sourceType: "module" },
    plugins:         { import: fixupPluginRules(_import), "simple-import-sort": simpleImportSort, "sort-keys": sortKeys },
    rules:           {
      "@typescript-eslint/no-empty-function":     "off",
      "@typescript-eslint/no-empty-interface":    "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "arrow-body-style":                         ["error", "as-needed"],
      "arrow-parens":                             ["error", "as-needed"],
      "arrow-spacing":                            "error",
      "brace-style":                              ["error", "1tbs", { allowSingleLine: true }],
      curly:                                      ["error", "multi-or-nest"],
      eqeqeq:                                     ["error"],
      "import/first":                             "error",
      "import/newline-after-import":              "error",
      "import/no-duplicates":                     "error",
      indent:                                     ["error", 2],
      "key-spacing":                              ["error", { align: { afterColon: true, beforeColon: false, on: "value" } }],
      "keyword-spacing":                          ["error", { before: true, overrides: { catch: { after: false }, for: { after: false }, if: { after: false }, switch: { after: false }, while: { after: false } } }],
      "linebreak-style":                          ["error", "unix"],
      "no-console":                               "warn",
      "no-mixed-spaces-and-tabs":                 ["error", "smart-tabs"],
      "nonblock-statement-body-position":         ["error", "beside"],
      "prefer-const":                             ["error", { destructuring: "all" }],
      semi:                                       ["error", "always"],
      "simple-import-sort/exports":               "error",
      "simple-import-sort/imports":               "error",
      "sort-keys":                                "off",
      "sort-keys/sort-keys-fix":                  "error",
      "space-before-function-paren":              ["error", { anonymous: "never", asyncArrow: "always", named: "never" }],
      "space-unary-ops":                          ["error", { nonwords: false, overrides: { "!": true }, words: true }]
    }
  }
];
