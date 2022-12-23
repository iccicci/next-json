import { readFileSync, writeFileSync } from "fs";
import peggy, { ParserBuildOptions } from "peggy";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tspegjs from "ts-pegjs";

const parser = peggy.generate(readFileSync("./next-json.pegjs").toString(), {
  format:  "commonjs",
  output:  "source",
  plugins: [tspegjs],
  tspegjs: {
    customHeader: [
      "/* eslint-disable @typescript-eslint/no-explicit-any */",
      "/* eslint-disable @typescript-eslint/no-unused-vars */",
      "/* eslint-disable arrow-body-style */",
      "/* eslint-disable arrow-parens */",
      "/* eslint-disable curly */",
      "/* eslint-disable indent */",
      "/* eslint-disable key-spacing */",
      "/* eslint-disable keyword-spacing */",
      "/* eslint-disable prefer-const */",
      "/* eslint-disable sort-keys-fix/sort-keys-fix */",
      "/* eslint-disable space-unary-ops */"
    ].join("\n"),
    errorName: "NJSONError"
  }
} as unknown as ParserBuildOptions);

writeFileSync("./parser.ts", parser as unknown as string);
