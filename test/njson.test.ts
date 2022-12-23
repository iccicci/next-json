import { readdirSync, readFileSync } from "fs";

import { NJSON } from "../index";

describe("NJSON", () => {
  const dir = readdirSync("./test/njson").filter(_ => _.match(/\.njson$/));
  const inputs: string[] = [];
  const outputs: string[] = [];

  dir.forEach(_ => {
    const input = _.match(/^(.*).njson$/);
    const output = _.match(/^(.*).out.njson$/);

    if(output) outputs.push(output[1]);
    else if(input) inputs.push(input[1]);
  });

  outputs.forEach(_ => {
    if(! inputs.includes(_)) throw new Error(`Missing input file '${_}.njson' for output file '${_}.out.njson'`);
  });

  inputs.sort().forEach(_ => {
    const input = readFileSync(`./test/njson/${_}.njson`).toString();
    const output = (outputs.includes(_) ? readFileSync(`./test/njson/${_}.out.njson`).toString() : input).replace(/\n$/, "");

    it(_, () => {
      expect(NJSON.stringify(eval(`(${input})`))).toStrictEqual(output);
      expect(NJSON.stringify(NJSON.parse(input))).toStrictEqual(output);
    });
  });
});
