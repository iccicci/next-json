import { readdirSync, readFileSync } from "fs";

import { NJSON } from "../index";

describe("JSON compliance", () => {
  describe("NJSON.parse Vs JSON.parse", () => {
    const dir = readdirSync("./test/json").filter(_ => _.match(/\.json$/));
    const inputs: string[] = [];

    dir.forEach(_ => {
      const input = _.match(/^(.*).json$/);

      if(input) inputs.push(input[1]);
    });

    inputs.sort().forEach(_ => {
      const input = readFileSync(`./test/json/${_}.json`).toString();

      it(_, () => expect(NJSON.parse(input)).toStrictEqual(JSON.parse(input)));
    });
  });

  describe("NJSON.stringify Vs JSON.stringify", () => {
    const func = () => null;
    const symbol = Symbol();
    const tests: [string, unknown][] = [
      ["array", ["njson", null, [], {}, false]],
      ["functions", [func, { func }, func]],
      ["null", null],
      ["object", { array: [null, false, [null, { ok: "njson" }]], false: false, null: null, number: 23, string: "njson", true: true }],
      ["string", "njson"],
      ["symbols", [symbol, { symbol }, symbol]]
    ];

    tests.forEach(([name, value]) => {
      it(name, () => expect(JSON.parse(NJSON.stringify(value))).toStrictEqual(JSON.parse(JSON.stringify(value))));
    });

    it("function", () => expect(NJSON.stringify(func)).toStrictEqual(JSON.stringify(func)));
    it("symbol", () => expect(NJSON.stringify(symbol)).toStrictEqual(JSON.stringify(symbol)));
  });
});
