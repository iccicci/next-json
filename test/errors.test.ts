import { NJSON } from "../index";

const match = process.version.match(/^v([0-9]+)\./);
const version = match ? match[1] : 0;

const tests: Record<string, [string, string]> = {
  "bad add method":               ["((A)=>{A.add(1)})(1)", 'Can\'t call method "add" on Number at 1:10'],
  "bad date":                     ["new Date(njson)", 'Expected number or string but "n" found at 1:10'],
  "bad date format":              ['new\nDate("njson")', "Invalid date at 2:6"],
  "bad map 1":                    ['new Map("njson")', 'Expected ")" or "[" but "\\"" found at 1:9'],
  "bad map 2":                    ["new Map([[1,2,3]])", 'Expected "]" but "," found at 1:14'],
  "bad number":                   ["1w1", 'Expected end of input but "w" found at 1:2'],
  "bad push method":              ["((A)=>{A.push(1)})(1)", 'Can\'t call method "push" on Number at 1:10'],
  "bad regexp 1":                 ["new RegExp(", "Expected string but end of input found at 1:12"],
  "bad regexp 2":                 ["new RegExp(0", 'Expected string but "0" found at 1:12'],
  "bad regexp 3":                 ['new RegExp("a"', 'Expected ")" or "," but end of input found at 1:15'],
  "bad regexp 4":                 ['new RegExp("a",)', 'Expected string but ")" found at 1:16'],
  "bad regexp 5":                 ['new RegExp("a","a")', "Invalid flags supplied to RegExp constructor 'a' at 1:16"],
  "bad regexp 6":                 ['new RegExp("[a")', "Invalid regular expression: /[a/: Unterminated character class at 1:12"],
  "bad set":                      ["new Set(23)", 'Expected ")" or "[" but "2" found at 1:9'],
  "bad set method":               ["((A)=>{A.set(1,1)})(1)", 'Can\'t call method "set" on Number at 1:10'],
  "bad unicode":                  ['"\\u12"', "Invalid Unicode escape sequence at 1:6"],
  "bad url":                      ['\nnew\nURL(\n   "njson")', version === "14" ? "Invalid URL: njson at 4:4" : "Invalid URL at 4:4"],
  "bigint in Float32Array":       ["new Float32Array([10n])", 'Expected ",", ".", "]", [0-9], or [eE] but "n" found at 1:21'],
  "bigint in Int8Array":          ["new Int8Array([10n])", 'Expected ",", "]", or [0-9] but "n" found at 1:18'],
  "bigint in Uint16Array":        ["new Uint16Array([10n])", 'Expected ",", "]", or [0-9] but "n" found at 1:20'],
  "chained add to push":          ["((A)=>{A.push(1).add(1)})([])", 'Can\'t call method "add" on Number at 1:18'],
  "chained push":                 ["((A)=>{A.push(1).push(1)})([])", 'Can\'t call method "push" on Number at 1:18'],
  "chained set to push":          ["((A)=>{A.push(1).set(1,2)})([])", 'Can\'t call method "set" on Number at 1:18'],
  "float in Int16Array":          ["new Int16Array([-10.5])", 'Expected ",", "]", or [0-9] but "." found at 1:20'],
  "float in Int32Array":          ["new Int32Array([-10.5])", 'Expected ",", "]", or [0-9] but "." found at 1:20'],
  "float in Int8Array":           ["new Int8Array([-10e5])", 'Expected ",", "]", or [0-9] but "e" found at 1:19'],
  "identifier not in body":       ['{"a":A}', "Unexpected identifier in this context at 1:6"],
  "missing colon in object":      ['{"a" "b"}', 'Expected ":" but "\\"" found at 1:6'],
  "missing comma in array":       ["[1 2]", 'Expected "," or "]" but "2" found at 1:4'],
  "missing comma in object":      ['{"a":"b" "c"}', 'Expected "," or "}" but "\\"" found at 1:10'],
  "negative in Uint16Array":      ["new Uint16Array([-10])", 'Expected "0", "]", or [1-9] but "-" found at 1:18'],
  "negative in Uint32Array":      ["new Uint32Array([-10])", 'Expected "0", "]", or [1-9] but "-" found at 1:18'],
  "negative in Uint8Array":       ["new Uint8Array([-10])", 'Expected "0", "]", or [1-9] but "-" found at 1:17'],
  "new date without white space": ["newDate(23)", 'Expected white space but "D" found at 1:4'],
  "not closed array 1":           ["[", 'Expected "Object", "[", "]", "false", "new", "null", "true", "undefined", "{", [A-Z], bigint, number, or string but end of input found at 1:2'],
  "not closed array 2":           ["[0", 'Expected "," or "]" but end of input found at 1:3'],
  "not closed array 3":           ["[0,", 'Expected "Object", "[", "]", "false", "new", "null", "true", "undefined", "{", [A-Z], bigint, number, or string but end of input found at 1:4'],
  "not closed object 1":          ["{", 'Expected "}" or string but end of input found at 1:2'],
  "not closed object 2":          ['{"a"', 'Expected ":" but end of input found at 1:5'],
  "not closed object 3":          ['{"a":', 'Expected "Object", "[", "false", "new", "null", "true", "undefined", "{", [A-Z], bigint, number, or string but end of input found at 1:6'],
  "not closed object 4":          ['{"a":0', 'Expected "," or "}" but end of input found at 1:7'],
  "not closed object 5":          ['{"a":0,', 'Expected "}" or string but end of input found at 1:8'],
  "not closed string":            ['{"":"', 'Expected "Object", "[", "false", "new", "null", "true", "undefined", "{", [A-Z], bigint, number, or string but "\\"" found at 1:5'],
  "number in BigInt64Array":      ["new BigInt64Array([10])", 'Expected "]" or bigint but "1" found at 1:20'],
  "undeclared variable 1":        ["((A)=>{return B})(1)", "Undeclared variable B at 1:15"],
  "undeclared variable 2":        ["((A)=>{return\n B})(1)", "Undeclared variable B at 2:2"],
  "undeclared variable 3":        ["((A)=>{\n  B.push(1)})(1)", "Undeclared variable B at 2:3"],
  "wrong arguments number":       ["((A)=>{return A})(1,2)", "Expected 1 arguments but 2 found at 1:18"]
};

describe("errors", () => {
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
  );

  const obj = { njson: [new Set([new Map([["njson", new Error("njson")]])])] };
  const throwing = (key: unknown, value: unknown) => {
    if(key === "message") throw new Error("njson");

    return value;
  };

  it("throwing replacer", () => expect(() => NJSON.stringify(obj, throwing)).toThrow(new Error("njson")));
  it("throwing reviver", () => expect(() => NJSON.parse(NJSON.stringify(obj), throwing)).toThrow(new Error("njson")));
});
