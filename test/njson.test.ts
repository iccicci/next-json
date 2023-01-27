import { readdirSync, readFileSync } from "fs";

import { NJSON } from "../index";

describe("NJSON", () => {
  describe("simple cases", () => {
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
        expect(NJSON.stringify(eval(`(${input})`))).toBe(output);
        expect(NJSON.stringify(NJSON.parse(input))).toBe(output);
      });
    });
  });

  it("string new line escape", () => expect(NJSON.parse('"\\\nn\\\nj\\\rs\\\r\no\\\n\\\rn\\\n\\\r\n\\\r"')).toBe("njson"));

  it("TypedArray", () => expect(NJSON.stringify([new ArrayBuffer(0), new Uint8Array([23, 42]), new BigInt64Array([23n, 42n])])).toBe("[{},new Uint8Array([23,42]),new BigInt64Array([23n,42n])]"));

  it("complex case", () => {
    const plain = readFileSync("./test/plain.njson").toString().replace(/\n$/, "");
    const space = readFileSync("./test/space.njson").toString().replace(/\n$/, "");

    const object1 = { njson: "test" };
    const map = new Map([["njson", object1]]);
    const object2 = { test: "njson" };
    const set = new Set([object2]);
    const object3 = { map, set };
    const uint8 = new Uint8Array([23, 42]);
    const thrownMessage = "thrown error";
    const thrownError = new EvalError(thrownMessage);
    const value = [object3, uint8, thrownError];

    const replacer_reviver = function(key: number | string, value: unknown) {
      return value;
    };
    const replacer1 = jest.fn(replacer_reviver);
    const replacer2 = jest.fn(replacer_reviver);
    const reviver1 = jest.fn(replacer_reviver);
    const reviver2 = jest.fn(replacer_reviver);

    expect(NJSON.stringify(value, { replacer: replacer1 })).toBe(plain);
    expect(NJSON.stringify(value, { numberKey: true, replacer: replacer2, space: 2 })).toBe(space);

    expect(replacer1.mock.calls).toStrictEqual([
      ["", value],
      ["0", object3],
      ["map", map],
      [0, ["njson", object1]],
      ["njson", "test"],
      ["set", set],
      [0, object2],
      ["test", "njson"],
      ["1", uint8],
      ["2", thrownError],
      ["message", thrownMessage]
    ]);

    expect(replacer1.mock.contexts).toStrictEqual([{ "": value }, value, object3, map, object1, object3, set, object2, value, value, thrownError]);

    expect(replacer2.mock.calls).toStrictEqual([
      ["", value],
      [0, object3],
      ["map", map],
      [0, ["njson", object1]],
      ["njson", "test"],
      ["set", set],
      [0, object2],
      ["test", "njson"],
      [1, uint8],
      [2, thrownError],
      ["message", thrownMessage]
    ]);

    expect(replacer2.mock.contexts).toStrictEqual(replacer1.mock.contexts);

    expect(NJSON.parse(plain, { reviver: reviver1 })).toStrictEqual(value);
    expect(NJSON.parse(space, { numberKey: true, reviver: reviver2 })).toStrictEqual(value);

    expect(reviver1.mock.calls).toStrictEqual([
      ["njson", "test"],
      [0, ["njson", object1]],
      ["map", map],
      ["test", "njson"],
      [0, object2],
      ["set", set],
      ["0", object3],
      ["1", uint8],
      ["message", thrownMessage],
      ["2", thrownError],
      ["", value]
    ]);

    expect(reviver1.mock.contexts).toStrictEqual([object1, map, object3, object2, set, object3, value, value, thrownError, value, { "": value }]);

    expect(reviver2.mock.calls).toStrictEqual([
      ["njson", "test"],
      [0, ["njson", object1]],
      ["map", map],
      ["test", "njson"],
      [0, object2],
      ["set", set],
      [0, object3],
      [1, uint8],
      ["message", thrownMessage],
      [2, thrownError],
      ["", value]
    ]);

    expect(reviver2.mock.contexts).toStrictEqual(reviver1.mock.contexts);
  });
});
