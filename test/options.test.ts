import { NJSON } from "../index";

const match = process.version.match(/^v([0-9]+)\./);
const version = match ? parseInt(match[1], 10) : 0;
const v18it = version >= 18 ? it : it.skip;

describe("options", () => {
  describe("NJSON.parse", () => {
    it("numberKey", () => {
      NJSON.parse("[null]", {
        numberKey: true,
        reviver:   (key, value) => {
          if(! value) expect(typeof key).toBe("number");

          return value;
        }
      });

      NJSON.parse("[null]", {
        reviver: (key, value) => {
          if(! value) expect(typeof key).toBe("string");

          return value;
        }
      });

      expect.assertions(2);
    });

    it("reviver", () => {
      const value = '["null",{"false":true,"string":"njson"},{"subArray":[false,null,true,[],{}]}]';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reviver = function(this: any, key: number | string, value: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return key === "0" && this.length === 3 ? null : key === "false" ? false : value;
      };
      const jsonReviver = jest.fn(reviver);
      const njsonReviver1 = jest.fn(reviver);
      const njsonReviver2 = jest.fn(reviver);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const jsonResult = JSON.parse(value, jsonReviver);
      const njsonResult1 = NJSON.parse(value, njsonReviver1);
      const njsonResult2 = NJSON.parse(value, { reviver: njsonReviver2 });

      const expectedCalls = jsonReviver.mock.calls.map(([a, b]) => [a, b]);

      expect(njsonReviver1.mock.calls).toStrictEqual(expectedCalls);
      expect(njsonReviver1.mock.contexts).toStrictEqual(njsonReviver1.mock.contexts);
      expect(njsonReviver1.mock.results).toStrictEqual(jsonReviver.mock.results);
      expect(njsonReviver2.mock.calls).toStrictEqual(expectedCalls);
      expect(njsonReviver2.mock.contexts).toStrictEqual(njsonReviver1.mock.contexts);
      expect(njsonReviver2.mock.results).toStrictEqual(jsonReviver.mock.results);
      expect(njsonResult1).toStrictEqual(jsonResult);
      expect(njsonResult2).toStrictEqual(jsonResult);
    });

    it("reviver for Map", () => {
      expect(NJSON.parse("new Map([[1,2],[3,4],[5,6],[7,8]])", { reviver: (key, value) => [value, [9, 10], ["njson"], [5, 11]][(key as number) || 0] })).toStrictEqual(
        new Map([
          [1, 2],
          [9, 10],
          [5, 11]
        ])
      );
    });

    it("reviver for Set", () => {
      expect(NJSON.parse("new Set([1,2,3])", { reviver: (key, value) => (key === 1 ? 4 : value) })).toStrictEqual(new Set([1, 4, 3]));
    });
  });

  describe("NJSON.stringify", () => {
    const spaceValue = [null, { false: false, string: "njson" }, { subArray: [false, null, true, [], {}] }];

    describe("date", () => {
      const date = new Date("1976-01-23T14:00:00.000Z");

      it("default", () => expect(NJSON.stringify(date)).toBe("new Date(191253600000)"));
      it("iso", () => expect(NJSON.stringify(date, { date: "iso" })).toBe('new Date("1976-01-23T14:00:00.000Z")'));
      it("string", () => expect(NJSON.stringify(date, { date: "string" })).toBe('new Date("Fri Jan 23 1976 15:00:00 GMT+0100 (Central European Standard Time)")'));
      it("time", () => expect(NJSON.stringify(date, { date: "time" })).toBe("new Date(191253600000)"));
      it("utc", () => expect(NJSON.stringify(date, { date: "utc" })).toBe('new Date("Fri, 23 Jan 1976 14:00:00 GMT")'));
    });

    it("numberKey", () => {
      expect(NJSON.stringify([null], { numberKey: true, replacer: [0] })).toBe("[null]");

      NJSON.stringify([null], {
        numberKey: true,
        replacer:  (key, value) => {
          if(! value) expect(typeof key).toBe("number");

          return value;
        }
      });

      NJSON.stringify([null], {
        replacer: (key, value) => {
          if(! value) expect(typeof key).toBe("string");

          return value;
        }
      });

      expect.assertions(3);
    });

    it("sortKeys", () => {
      const obj: Record<string, number> = { b: 23, c: 0 };

      obj.a = 42;
      expect(NJSON.stringify(obj)).toBe('{"b":23,"c":0,"a":42}');
      expect(NJSON.stringify(obj, { sortKeys: true })).toBe('{"a":42,"b":23,"c":0}');

      const obj2 = { test: Infinity };
      const set = new Set<unknown>([obj2]);
      const arr: unknown[] = [NaN, obj2, set];
      set.add(arr);
      arr.push(arr);
      expect(NJSON.stringify(arr)).toBe('((A,B)=>{B.push(A,new Set([A,B]),B);return B})({"test":Infinity},[NaN])');
    });

    it("function replacer", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replacer = function(this: any, key: number | string, value: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return key === "0" && this.length === 3 ? "null" : key === "false" ? true : value;
      };
      const jsonReplacer = jest.fn(replacer);
      const njsonReplacer1 = jest.fn(replacer);
      const njsonReplacer2 = jest.fn(replacer);
      const jsonResult = JSON.stringify(spaceValue, jsonReplacer);
      const njsonResult1 = NJSON.stringify(spaceValue, njsonReplacer1);
      const njsonResult2 = NJSON.stringify(spaceValue, { replacer: njsonReplacer2 });

      expect(njsonReplacer1.mock.calls).toStrictEqual(jsonReplacer.mock.calls);
      expect(njsonReplacer1.mock.contexts).toStrictEqual(njsonReplacer1.mock.contexts);
      expect(njsonReplacer1.mock.results).toStrictEqual(jsonReplacer.mock.results);
      expect(njsonReplacer2.mock.calls).toStrictEqual(jsonReplacer.mock.calls);
      expect(njsonReplacer2.mock.contexts).toStrictEqual(njsonReplacer1.mock.contexts);
      expect(njsonReplacer2.mock.results).toStrictEqual(jsonReplacer.mock.results);
      expect(njsonResult1).toBe(jsonResult);
      expect(njsonResult2).toBe(jsonResult);
    });

    it("array replacer", () => {
      const replaceValue = { subObject: { 0: 1, 2: 3 } };

      expect(NJSON.stringify(spaceValue, ["subArray"])).toBe(JSON.stringify(spaceValue, ["subArray"]));
      expect(NJSON.stringify(replaceValue, { replacer: [0, "subObject"] })).toBe(JSON.stringify(replaceValue, [0, "subObject"]));
    });

    it("replacer for Map", () => {
      expect(
        NJSON.stringify(
          new Map([
            [1, 2],
            [3, 4],
            [5, 6],
            [7, 8]
          ]),
          { replacer: (key, value) => [value, [9, 10], "njson", [5, 11]][(key as number) || 0] }
        )
      ).toStrictEqual("new Map([[1,2],[9,10],[5,11]])");
    });

    it("number space", () => {
      expect(NJSON.stringify(spaceValue, null, 2)).toBe(JSON.stringify(spaceValue, null, 2));
      expect(NJSON.stringify(spaceValue, { space: 2 })).toBe(JSON.stringify(spaceValue, null, 2));
      expect(NJSON.stringify(spaceValue, null, -1)).toBe(JSON.stringify(spaceValue, null, -1));
    });

    v18it("number space - V18", () => {
      expect(NJSON.stringify(spaceValue, null, 0.5)).toBe(JSON.stringify(spaceValue, null, 0.5));
    });

    it("string space", () => {
      expect(NJSON.stringify(spaceValue, null, " \t ")).toBe(JSON.stringify(spaceValue, null, " \t "));
      expect(NJSON.stringify(spaceValue, { space: " \t " })).toBe(JSON.stringify(spaceValue, null, " \t "));
    });

    it("undef", () => {
      const undefinedValue = { array: [undefined, "njson", undefined], object: { njson: undefined, ok: "njson" }, undef: undefined };

      expect(NJSON.stringify(undefinedValue, { undef: false })).toBe(JSON.stringify(undefinedValue));
    });
  });
});
