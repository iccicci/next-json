import { readdirSync, readFileSync } from "fs";

import { NJSON, NjsonStringifyOptions } from "../index";

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
        expect(NJSON.stringify(eval(`(${input})`), { omitStack: true })).toBe(output);
        expect(NJSON.stringify(NJSON.parse(input), { omitStack: true })).toBe(output);
      });
    });
  });

  it("escaped new line", () => expect(NJSON.parse('"\\\nn\\\nj\\\rs\\\r\no\\\n\\\rn\\\n\\\r\n\\\r"')).toBe("njson"));

  it("TypedArray", () => expect(NJSON.stringify([new ArrayBuffer(0), new Uint8Array([23, 42]), new BigInt64Array([23n, 42n])])).toBe("[{},new Uint8Array([23,42]),new BigInt64Array([23n,42n])]"));

  it("Float*Array NaN Infinity -0", () => {
    const values = [NaN, Infinity, -Infinity, -0];
    const f32 = new Float32Array(values);
    const f64 = new Float64Array(values);
    const s32 = NJSON.stringify(f32);
    const s64 = NJSON.stringify(f64);

    expect(s32).toBe("new Float32Array([NaN,Infinity,-Infinity,-0])");
    expect(s64).toBe("new Float64Array([NaN,Infinity,-Infinity,-0])");
    expect(NJSON.parse(s32)).toEqual(f32);
    expect(NJSON.parse(s64)).toEqual(f64);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    expect(Object.is((NJSON.parse(s32) as Float32Array)[3], -0)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    expect(Object.is((NJSON.parse(s64) as Float64Array)[3], -0)).toBe(true);
  });

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
    const replacer1 = vi.fn(replacer_reviver);
    const replacer2 = vi.fn(replacer_reviver);
    const reviver1 = vi.fn(replacer_reviver);
    const reviver2 = vi.fn(replacer_reviver);

    expect(NJSON.stringify(value, { omitStack: true, replacer: replacer1 })).toBe(plain);
    expect(NJSON.stringify(value, { numberKey: true, omitStack: true, replacer: replacer2, space: 2 })).toBe(space);

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

  describe("Error type", () => {
    const check = (
      description: string,
      value: unknown,
      stringified: string,
      cause: unknown,
      message: string,
      name: string,
      stack: string,
      options?: NjsonStringifyOptions,
      getError: (vale: unknown) => Error = _ => _ as Error
    ) =>
      describe(description, () => {
        let error: Error;
        let parsed: Error;
        let str: string;

        beforeAll(() => {
          str = NJSON.stringify(value, options);

          try {
            parsed = NJSON.parse<Error>(str);
            error = getError(parsed);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch(e: any) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            throw new Error(`${e.message} parsing '${str}'`, { cause: e });
          }
        });

        it("stringified", () => expect(str).toBe(stringified));
        it("cause", () => expect(NJSON.stringify(error.cause, options)).toBe(NJSON.stringify(cause, options)));
        it("message", () => expect(error.message).toBe(message));
        it("name", () => expect(error.name).toBe(name));
        it("stack", () => expect(error.stack).toBe(stack));
      });

    const fakeStack = (e: Error) => Object.defineProperty(e, "stack", { enumerable: false, value: `${e.stack?.split("\n")[0]}\n    njson stack`, writable: true });
    const cause = fakeStack(new Error("cause"));
    const setCause = (e: Error, value: unknown = cause) => Object.defineProperty(e, "cause", { enumerable: false, value, writable: true });
    const longMessage = "long njson message";

    class TestError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "TestError";
      }
    }

    check("simple", new Error("njson"), 'new Error("njson")', undefined, "njson", "Error", "Error: njson\n    from NJSON", { omitStack: true });

    check("with cause", setCause(new RangeError("njson")), 'Object.assign(new RangeError("njson"),{"cause":new Error("cause")})', cause, "njson", "RangeError", "RangeError: njson\n    from NJSON", {
      omitStack: true
    });

    check("with name", new TestError("njson"), 'Object.assign(new Error("njson"),{"name":"TestError"})', undefined, "njson", "TestError", "TestError: njson\n    from NJSON", { omitStack: true });

    check(
      "with stack",
      fakeStack(new EvalError("njson")),
      'Object.assign(new EvalError("njson"),{"stack":"EvalError: njson\\n    njson stack"})',
      undefined,
      "njson",
      "EvalError",
      "EvalError: njson\n    njson stack"
    );

    check(
      "with cause and name",
      setCause(new TestError("njson")),
      'Object.assign(new Error("njson"),{"cause":new Error("cause"),"name":"TestError"})',
      cause,
      "njson",
      "TestError",
      "TestError: njson\n    from NJSON",
      { omitStack: true }
    );

    check(
      "with cause and stack",
      setCause(fakeStack(new ReferenceError("njson"))),
      'Object.assign(new ReferenceError("njson"),{"cause":Object.assign(new Error("cause"),{"stack":"Error: cause\\n    njson stack"}),"stack":"ReferenceError: njson\\n    njson stack"})',
      cause,
      "njson",
      "ReferenceError",
      "ReferenceError: njson\n    njson stack"
    );

    check(
      "with name and stack",
      fakeStack(new TestError("njson")),
      'Object.assign(new Error("njson"),{"name":"TestError","stack":"TestError: njson\\n    njson stack"})',
      undefined,
      "njson",
      "TestError",
      "TestError: njson\n    njson stack"
    );

    check(
      "with cause, name and stack",
      setCause(fakeStack(new TestError("njson"))),
      'Object.assign(new Error("njson"),{"cause":Object.assign(new Error("cause"),{"stack":"Error: cause\\n    njson stack"}),"name":"TestError","stack":"TestError: njson\\n    njson stack"})',
      cause,
      "njson",
      "TestError",
      "TestError: njson\n    njson stack"
    );

    const error1 = setCause(fakeStack(new SyntaxError("njson")));

    check(
      "repeated with stack and repeated cause",
      [error1, error1, cause],
      '((A,B)=>[Object.assign(A,{"cause":B,"stack":"SyntaxError: njson\\n    njson stack"}),A,B])(new SyntaxError("njson"),Object.assign(new Error("cause"),{"stack":"Error: cause\\n    njson stack"}))',
      cause,
      "njson",
      "SyntaxError",
      "SyntaxError: njson\n    njson stack",
      {},
      _ => (_ as Error[])[0]
    );

    const error2 = setCause(fakeStack(new TypeError("njson")));

    check(
      "repeated without repeated properties",
      [error2, error2],
      '((A)=>[A,A])(Object.assign(new TypeError("njson"),{"cause":Object.assign(new Error("cause"),{"stack":"Error: cause\\n    njson stack"}),"stack":"TypeError: njson\\n    njson stack"}))',
      cause,
      "njson",
      "TypeError",
      "TypeError: njson\n    njson stack",
      {},
      _ => (_ as Error[])[0]
    );

    const error3 = new URIError(longMessage);

    check(
      "not repeated with repeated message",
      [error3, longMessage],
      '((A)=>[new URIError(A),A])("long njson message")',
      undefined,
      longMessage,
      "URIError",
      `URIError: ${longMessage}\n    from NJSON`,
      { omitStack: true, stringLength: 10 },
      _ => (_ as Error[])[0]
    );

    check(
      "repeated with repeated message",
      [error3, error3, longMessage],
      '((A,B)=>[Object.assign(A,{"message":B}),A,B])(new URIError(""),"long njson message")',
      undefined,
      longMessage,
      "URIError",
      `URIError: ${longMessage}\n    from NJSON`,
      { omitStack: true, stringLength: 10 },
      _ => (_ as Error[])[0]
    );

    const error4 = setCause(new TestError(longMessage));

    check(
      "repeated with cause, name and repeated message",
      [error4, error4, longMessage],
      '((A,B)=>[Object.assign(A,{"cause":new Error("cause"),"message":B,"name":"TestError"}),A,B])(new Error(""),"long njson message")',
      cause,
      longMessage,
      "TestError",
      `TestError: ${longMessage}\n    from NJSON`,
      { omitStack: true, stringLength: 10 },
      _ => (_ as Error[])[0]
    );

    const error5 = Object.assign(fakeStack(new Error("njson")), { njson: "njson" });

    check("with custom property", error5, 'Object.assign(new Error("njson"),{"stack":"Error: njson\\n    njson stack","njson":"njson"})', undefined, "njson", "Error", "Error: njson\n    njson stack");

    const unused = () => "unused";
    const error6 = Object.assign(fakeStack(new Error("test")), { unused, unused2: unused });

    check("with repeated function", error6, 'Object.assign(new Error("test"),{"stack":"Error: test\\n    njson stack"})', undefined, "test", "Error", "Error: test\n    njson stack");
  });

  describe("trailing commas", () => {
    it("in object", () => expect(NJSON.parse('{"json":"test","test":"json",}')).toEqual({ json: "test", test: "json" }));
    it("in array", () => expect(NJSON.parse("[1,2,3,]")).toEqual([1, 2, 3]));
    it("in push", () => expect(NJSON.parse("((A)=>{A.push(1,2,3,);return A})([])")).toEqual([1, 2, 3]));
  });

  describe("sparse arrays", () => {
    const properties = (array: unknown[], length: number, properties: number[]) => {
      if(array.length !== length) throw new Error(`Array length mismatch: ${array.length} !== ${length}`);

      for(let i = 0; i < length; ++i)
        if(properties.includes(i)) {
          if(! Object.hasOwn(array, i)) throw new Error(`Property ${i} is not defined`);
        } else if(Object.hasOwn(array, i)) throw new Error(`Property ${i} is defined`);
    };

    describe("simple 0", () => {
      const sparse = [1, , 3];

      describe("plain", () => {
        const stringified = "[1,,3]";

        it("stringified", () => expect(NJSON.stringify(sparse)).toBe(stringified));
        it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
        it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
        it("properties", () => properties(NJSON.parse(stringified), 3, [0, 2]));
      });

      describe("indented", () => {
        const stringified = "[\n  1,\n  ,\n  3\n]";

        it("stringified", () => expect(NJSON.stringify(sparse, { space: 2 })).toBe(stringified));
        it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
        it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
      });
    });

    describe("simple 1", () => {
      const sparse = [1, , 3, ,];

      describe("plain", () => {
        const stringified = "[1,,3,,]";

        it("stringified", () => expect(NJSON.stringify(sparse)).toBe(stringified));
        it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
        it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
        it("properties", () => properties(NJSON.parse(stringified), 4, [0, 2]));
      });

      describe("indented", () => {
        const stringified = "[\n  1,\n  ,\n  3,\n  ,\n]";

        it("stringified", () => expect(NJSON.stringify(sparse, { space: 2 })).toBe(stringified));
        it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
        it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
      });
    });

    describe("simple 2", () => {
      const sparse = [1, , 3, , ,];

      describe("plain", () => {
        const stringified = "[1,,3,,,]";

        it("stringified", () => expect(NJSON.stringify(sparse)).toBe(stringified));
        it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
        it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
        it("properties", () => properties(NJSON.parse(stringified), 5, [0, 2]));
      });

      describe("indented", () => {
        const stringified = "[\n  1,\n  ,\n  3,\n  ,\n  ,\n]";

        it("stringified", () => expect(NJSON.stringify(sparse, { space: 2 })).toBe(stringified));
        it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
        it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
      });
    });

    describe("circular in the middle", () => {
      const sparse: unknown[] = [, , 1, , 3, , , , ,];
      const stringified = '((A)=>Object.assign(A,{"6":A}))([,,1,,3,,,,,])';

      sparse[6] = sparse;

      it("stringified", () => expect(NJSON.stringify(sparse)).toBe(stringified));
      it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
      it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
      it("properties", () => properties(NJSON.parse(stringified), 9, [2, 4, 6]));
    });

    describe("circular at the end", () => {
      const sparse: unknown[] = [, , 1, , 3, , , , ,];
      const stringified = '((A)=>Object.assign(A,{"9":A}))([,,1,,3])';

      sparse.push(sparse);

      it("stringified", () => expect(NJSON.stringify(sparse)).toBe(stringified));
      it("parsed", () => expect(NJSON.parse(stringified)).toStrictEqual(sparse));
      it("evaluated", () => expect(eval(`(${stringified})`)).toStrictEqual(sparse));
      it("properties", () => properties(NJSON.parse(stringified), 10, [2, 4, 9]));
    });

    describe("empty", () => {
      describe("replacer", () => {
        const replacer = (key: number | string, value: unknown) => (key === "1" ? NJSON.empty : value);

        it("correct", () => {
          expect(NJSON.stringify([1, 2, 3], replacer)).toBe("[1,,3]");
        });

        it("wrong", () => {
          expect(() => NJSON.stringify({ "1": 1 }, replacer)).toThrow("NJSON.empty can be used only in an Array context");
        });
      });

      describe("reviver", () => {
        const reviver = (key: number | string, value: unknown) => (key === "1" ? NJSON.empty : value);

        it("correct", () => {
          const parsed = NJSON.parse<unknown[]>("[1,2,3]", reviver);

          expect(parsed).toStrictEqual([1, , 3]);
          expect(properties(parsed, 3, [0, 2]));
        });

        it("wrong", () => {
          expect(() => NJSON.parse('{"1":1}', reviver)).toThrow("NJSON.empty can be used only in an Array context");
        });
      });
    });
  });
});
