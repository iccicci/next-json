import { NJSON } from "../index";

const match = process.version.match(/^v([0-9]+)\./);
const version = match ? match[1] : 0;
const v18it = version >= 18 ? it : it.skip;

function badReplacerReviver(key: number | string, value: unknown) {
  return [0, "message"].includes(key) ? 23 : value;
}

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
        return key === "0" && this.length === 3 ? null : key === "false" ? false : value;
      };
      const jsonReviver = jest.fn(reviver);
      const njsonReviver1 = jest.fn(reviver);
      const njsonReviver2 = jest.fn(reviver);
      const jsonResult = JSON.parse(value, jsonReviver);
      const njsonResult1 = NJSON.parse(value, njsonReviver1);
      const njsonResult2 = NJSON.parse(value, { reviver: njsonReviver2 });

      expect(njsonReviver1.mock.calls).toStrictEqual(jsonReviver.mock.calls);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((njsonReviver1.mock as any).contexts).toStrictEqual((njsonReviver1.mock as any).contexts);
      expect(njsonReviver1.mock.results).toStrictEqual(jsonReviver.mock.results);
      expect(njsonReviver2.mock.calls).toStrictEqual(jsonReviver.mock.calls);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((njsonReviver2.mock as any).contexts).toStrictEqual((njsonReviver1.mock as any).contexts);
      expect(njsonReviver2.mock.results).toStrictEqual(jsonReviver.mock.results);
      expect(njsonResult1).toStrictEqual(jsonResult);
      expect(njsonResult2).toStrictEqual(jsonResult);
    });

    it("bad reviver for Error", () => {
      expect(() => NJSON.parse('new Error("njson")', { reviver: badReplacerReviver })).toThrow(Error);
    });

    it("bad reviver for Map", () => {
      expect(() => NJSON.parse("new Map([[1,2]])", { reviver: badReplacerReviver })).toThrow(Error);
    });

    it("reviver for Map", () => {
      expect(NJSON.parse("new Map([[1,2],[3,4],[5,6]])", { reviver: (key, value) => [value, [7, 8], [5, 9]][(key as number) || 0] })).toStrictEqual(
        new Map([
          [1, 2],
          [7, 8],
          [5, 9]
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

    it("function replacer", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replacer = function(this: any, key: number | string, value: unknown) {
        return key === "0" && this.length === 3 ? "null" : key === "false" ? true : value;
      };
      const jsonReplacer = jest.fn(replacer);
      const njsonReplacer1 = jest.fn(replacer);
      const njsonReplacer2 = jest.fn(replacer);
      const jsonResult = JSON.stringify(spaceValue, jsonReplacer);
      const njsonResult1 = NJSON.stringify(spaceValue, njsonReplacer1);
      const njsonResult2 = NJSON.stringify(spaceValue, { replacer: njsonReplacer2 });

      expect(njsonReplacer1.mock.calls).toStrictEqual(jsonReplacer.mock.calls);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((njsonReplacer1.mock as any).contexts).toStrictEqual((njsonReplacer1.mock as any).contexts);
      expect(njsonReplacer1.mock.results).toStrictEqual(jsonReplacer.mock.results);
      expect(njsonReplacer2.mock.calls).toStrictEqual(jsonReplacer.mock.calls);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((njsonReplacer2.mock as any).contexts).toStrictEqual((njsonReplacer1.mock as any).contexts);
      expect(njsonReplacer2.mock.results).toStrictEqual(jsonReplacer.mock.results);
      expect(njsonResult1).toBe(jsonResult);
      expect(njsonResult2).toBe(jsonResult);
    });

    it("array replacer", () => {
      const replaceValue = { subObject: { 0: 1, 2: 3 } };

      expect(NJSON.stringify(spaceValue, ["subArray"])).toBe(JSON.stringify(spaceValue, ["subArray"]));
      expect(NJSON.stringify(replaceValue, { replacer: [0, "subObject"] })).toBe(JSON.stringify(replaceValue, [0, "subObject"]));
    });

    it("bad replacer for Error", () => {
      expect(() => NJSON.stringify(new Error("njson"), { replacer: badReplacerReviver })).toThrow(Error);
    });

    it("bad replacer for Map", () => {
      expect(() => NJSON.stringify(new Map([[1, 2]]), { replacer: badReplacerReviver })).toThrow(Error);
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
