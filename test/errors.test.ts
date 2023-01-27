import { NJSON } from "../index";

const match = process.version.match(/^v([0-9]+)\./);
const version = match ? match[1] : 0;

const expectedValue = 'Expected "[", "false", "new", "null", "true", "undefined", "{", [A-Z], number, or string but ';

const tests: Record<string, [string, string]> = {
  "bad add method":               ["((A)=>{A.add(1)})(1)", 'Can\'t call method "add" on Number at 1:8'],
  "bad assignment 1":             ['((A)=>{A["\\""]=1})([])', 'Expected integer but "\\"" found at 1:10'],
  "bad assignment 2":             ["((A)=>{A[1]=1})({})", 'Expected string but "1," found at 1:10'],
  "bad assignment 3":             ["((A)=>{A[1]=1})(1)", "Can't assign property to Number at 1:8"],
  "bad date":                     ["new Date(njson)", 'Expected number or string but "n" found at 1:10'],
  "bad date format":              ['new\nDate("njson")', "Invalid date at 2:6"],
  "bad map 1":                    ['new Map("njson")', 'Expected ")" or "[" but "\\"" found at 1:9'],
  "bad map 2":                    ["new Map([[1,2,3]])", 'Expected "]" but "," found at 1:14'],
  "bad number":                   ["1w1", 'Expected end of input but "w" found at 1:2'],
  "bad regexp 1":                 ["new RegExp(", "Expected string but end of input found at 1:12"],
  "bad regexp 2":                 ["new RegExp(0", 'Expected string but "0" found at 1:12'],
  "bad regexp 3":                 ['new RegExp("a"', 'Expected ")" or "," but end of input found at 1:15'],
  "bad regexp 4":                 ['new RegExp("a",)', 'Expected string but ")" found at 1:16'],
  "bad regexp 5":                 ['new RegExp("a","a")', "Invalid flags supplied to RegExp constructor 'a' at 1:16"],
  "bad regexp 6":                 ['new RegExp("[a")', "Invalid regular expression: /[a/: Unterminated character class at 1:12"],
  "bad set":                      ["new Set(23)", 'Expected ")" or "[" but "2" found at 1:9'],
  "bad set method":               ["((A)=>{A.set(1,1)})(1)", 'Can\'t call method "set" on Number at 1:8'],
  "bad unicode":                  ['"\\u12"', "Invalid Unicode escape sequence at 1:6"],
  "bad url":                      ['\nnew\nURL(\n   "njson")', version === "14" ? "Invalid URL: njson at 4:4" : "Invalid URL at 4:4"],
  "bigint in TypedArray":         ["new Int8Array([10n])", "BigInt is not allowed for TypedArray at 1:16"],
  "identifier not in body":       ['{"a":A}', "Unexpected identifier in this context at 1:6"],
  "missing colon in object":      ['{"a" "b"}', 'Expected ":" but "\\"" found at 1:6'],
  "missing comma in array":       ["[1 2]", 'Expected "," or "]" but "2" found at 1:4'],
  "missing comma in object":      ['{"a":"b" "c"}', 'Expected "," or "}" but "\\"" found at 1:10'],
  "new date without white space": ["newDate(23)", 'Expected white space but "D" found at 1:4'],
  "not closed array 1":           ["[", 'Expected "[", "]", "false", "new", "null", "true", "undefined", "{", [A-Z], number, or string but end of input found at 1:2'],
  "not closed array 2":           ["[0", 'Expected "," or "]" but end of input found at 1:3'],
  "not closed array 3":           ["[0,", expectedValue + "end of input found at 1:4"],
  "not closed object 1":          ["{", 'Expected "}" or string but end of input found at 1:2'],
  "not closed object 2":          ['{"a"', 'Expected ":" but end of input found at 1:5'],
  "not closed object 3":          ['{"a":', expectedValue + "end of input found at 1:6"],
  "not closed object 4":          ['{"a":0', 'Expected "," or "}" but end of input found at 1:7'],
  "not closed object 5":          ['{"a":0,', "Expected string but end of input found at 1:8"],
  "not closed string":            ['{"":"', expectedValue + '"\\"" found at 1:5'],
  "undeclared variable 1":        ["((A)=>{return B})(1)", "Undeclared variable B at 1:15"],
  "undeclared variable 2":        ["((A)=>{return\n B})(1)", "Undeclared variable B at 2:2"],
  "undeclared variable 3":        ['((A)=>{\n  B["a"]=1})(1)', "Undeclared variable B at 2:3"],
  "wrong arguments number":       ["((A)=>{return A})(1,2)", "Expected 1 arguments but 2 found at 1:18"]
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
