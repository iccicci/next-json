import { NJSON } from "../index";

const tests: Record<string, [string, string]> = {
  "bad date":                ["Date(njson)", 'Expected number or string but "n" found at 1:6'],
  "bad date format":         ['\nDate("njson")', "Invalid date at 2:1"],
  "bad escape":              ['"\\w"', 'Expected "Date", "[", "false", "null", "true", "undefined", "{", bigint, number, or string but "\\"" found at 1:1'],
  "bad number":              ["1w1", 'Expected end of input but "w" found at 1:2'],
  "bad unicode":             ['"\\u12"', 'Expected "Date", "[", "false", "null", "true", "undefined", "{", bigint, number, or string but "\\"" found at 1:1'],
  "missing colon in object": ['{"a" "b"}', 'Expected ":" but "\\"" found at 1:6'],
  "missing comma in array":  ["[1 2]", 'Expected "," or "]" but "2" found at 1:4'],
  "missing comma in object": ['{"a":"b" "c"}', 'Expected "," or "}" but "\\"" found at 1:10'],
  "not closed array":        ["[", 'Expected "Date", "[", "]", "false", "null", "true", "undefined", "{", bigint, number, or string but end of input found at 1:2'],
  "not closed object":       ["{", 'Expected "}" or string but end of input found at 1:2'],
  "not closed string":       ['"', 'Expected "Date", "[", "false", "null", "true", "undefined", "{", bigint, number, or string but "\\"" found at 1:1']
};

describe("errors", () =>
  Object.entries(tests).forEach(([key, [value, message]]) =>
    it(key, () => {
      try {
        NJSON.parse(value);
        expect(true).toBe(false);
      } catch(e) {
        if(e instanceof SyntaxError) expect(e.message).toBe(message);
        else expect(true).toBe(false);
      }
    })
  ));
