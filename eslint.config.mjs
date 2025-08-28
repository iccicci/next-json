import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import _import from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sortKeys from "eslint-plugin-sort-keys";
import globals from "globals";
import tsEslint from "typescript-eslint";

const overrides = { for: { after: false }, if: { after: false }, switch: { after: false }, while: { after: false } };
const unusedVarsOptions = { argsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true };

export default tsEslint.config(
  { ignores: ["coverage", "dist", "parser.ts"] },
  {
    extends:         [js.configs.recommended, ...tsEslint.configs.strictTypeChecked, ...tsEslint.configs.recommendedTypeChecked, ...tsEslint.configs.stylisticTypeChecked],
    files:           ["**/*.{cjs,js,mjs,ts}"],
    languageOptions: {
      ecmaVersion:   2020,
      globals:       globals.browser,
      parserOptions: {
        projectService:  { allowDefaultProject: ["eslint.config.mjs", "jest.config.cjs"], defaultProject: "tsconfig.json" },
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: { "@stylistic": stylistic, import: _import, "simple-import-sort": simpleImportSort, "sort-keys": sortKeys },
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
      curly:                                                       ["error", "multi-or-nest"],
      eqeqeq:                                                      ["error"],
      "import/first":                                              "error",
      "import/newline-after-import":                               "error",
      "import/no-duplicates":                                      "error",
      indent:                                                      ["error", 2],
      "key-spacing":                                               ["error", { align: { afterColon: true, beforeColon: false, on: "value" } }],
      "linebreak-style":                                           ["error", "unix"],
      "max-len":                                                   ["error", { code: 200, ignoreStrings: true }],
      "no-console":                                                "warn",
      "no-mixed-spaces-and-tabs":                                  ["error", "smart-tabs"],
      "prefer-const":                                              ["error", { destructuring: "all" }],
      "prefer-template":                                           "error",
      quotes:                                                      ["error", "double", { avoidEscape: true }],
      semi:                                                        ["error", "always"],
      "simple-import-sort/exports":                                "error",
      "simple-import-sort/imports":                                "error",
      "sort-keys":                                                 "off",
      "sort-keys/sort-keys-fix":                                   "error",
      "space-unary-ops":                                           ["error", { nonwords: false, overrides: { "!": true }, words: true }]
    }
  }
);
