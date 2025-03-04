import { readFileSync, writeFileSync } from "fs";
import peggy, { ParserBuildOptions } from "peggy";
import tspegjs from "ts-pegjs";

const customHeader = `\
const errors = { Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError };
type Errors = keyof typeof errors;

function addLocations(a: FileRange, b: FileRange): FileRange {
  const { start } = a;
  const { column, line, offset } = b.start;

  return { ...a, start: { column: line === 1 ? start.column + column - 1 : column, line: start.line + line - 1, offset: start.offset + offset } };
}
`;

const parser = peggy.generate(readFileSync("./next-json.pegjs").toString(), {
  allowedStartRules: ["NJSON", "statement"],
  format:            "commonjs",
  output:            "source",
  plugins:           [tspegjs],
  tspegjs:           {
    customHeader,
    errorName:           "NJSONError",
    skipTypeComputation: true
  }
} as unknown as ParserBuildOptions) as unknown as string;

writeFileSync("./parser.ts", parser.replace(/\/\* eslint-disable \*\//, ""));
