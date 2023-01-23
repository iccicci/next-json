import { NJSONError, parse as parser } from "./parser";

export type NjsonFunction = (this: unknown, key: number | string, value: unknown) => unknown;
export type NjsonReplacer = NjsonFunction | (number | string)[];

export interface NjsonParseOptions {
  numberKey?: boolean;
  reviver?: NjsonReplacer;
}

export interface NjsonStringifyOptions {
  date?: "iso" | "string" | "time" | "utc";
  numberKey?: boolean;
  replacer?: NjsonReplacer;
  space?: number | string;
  undef?: boolean;
}

function parse<T = unknown>(text: string, options?: NjsonParseOptions): T;
function parse<T = unknown>(text: string, reviver?: NjsonFunction): T;
function parse<T = unknown>(text: string, options?: NjsonParseOptions | NjsonFunction) {
  try {
    let result = parser(text, { grammarSource: "", ...options });

    if(typeof options === "function") options = { reviver: options };
    if(! options) options = {};
    if(typeof options.reviver !== "function") return result;

    const { numberKey, reviver } = options;

    function parse(value: unknown, skip = 0) {
      if(value && typeof value === "object" && ! (value instanceof Date) && ! (value instanceof RegExp) && ! (value instanceof URL)) {
        if(value instanceof Array) {
          value.forEach((_, i) => {
            const val = parse(_, skip ? skip - 1 : 0);

            value[i] = skip === 1 ? val : reviver.call(value, numberKey ? i : i.toString(), val);
          });
        } else if(value instanceof Error) {
          const revived = reviver.call(value, "message", value.message);

          if(typeof revived !== "string") throw new Error("The return value of reviver for an Error message must be a string");

          Object.defineProperty(value, "message", { configurable: true, value: revived, writable: true });
        } else if(value instanceof Map) {
          const elements = Array.from(value);
          const { length } = elements;

          elements.forEach((_, i) => {
            const revived = reviver.call(value, i, parse(_, 1));

            if(! (revived instanceof Array) || revived.length !== 2) throw new Error("The return value of reviver for a Map entry must be a two elements Array");

            const [key, val] = revived;

            if(key !== _[0]) {
              for(let l = i; l < length; ++l) value.delete(elements[l][0]);
              value.set(key, val);
              for(let l = i + i; l < length; ++l) value.set(...elements[l]);
            } else value.set(key, val);
          });
        } else if(value instanceof Set) {
          const elements = Array.from(value);
          const { length } = elements;

          elements.forEach((_, i) => {
            const revived = reviver.call(value, i, parse(_));

            if(revived !== _) {
              for(let l = i; l < length; ++l) value.delete(elements[l]);
              value.add(revived);
              for(let l = i + i; l < length; ++l) value.add(elements[l]);
            }
          });
        } else if(! ArrayBuffer.isView(value)) Object.entries(value).forEach(([key, val]) => ((value as Record<string, unknown>)[key] = reviver.call(value, key, parse(val))));
      }

      return value;
    }

    result = parse(result);

    return reviver.call({ "": result }, "", result) as T;
  } catch(e) {
    if(e instanceof NJSONError) {
      const err = new SyntaxError(e.format([]).substring(7).replace(".\n at :", " at "));
      const [first, , ...rest] = err.stack!.split("\n");

      Object.defineProperty(err, "stack", { value: [first, ...rest].join("\n") });

      throw err;
    }

    throw e;
  }
}

const errors = [EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError];

function stringify(value: unknown, options?: NjsonStringifyOptions): string;
function stringify(value: unknown, replacer?: NjsonReplacer | null, space?: number | string): string;
function stringify(value: unknown, options?: NjsonStringifyOptions | NjsonReplacer | null, space?: number | string) {
  let newLine = "";
  let numberKey = false;
  let replacer: NjsonFunction = (_, value) => value;
  let stringifyDate: (value: Date) => string = value => value.getTime().toString();
  let undef = true;
  let valueSeparator = ":";

  if(options) {
    let arrayReplacer: (number | string)[] | undefined = undefined;

    if(typeof options === "object") {
      if(options instanceof Array) arrayReplacer = options;
      else {
        if(options.date === "iso") stringifyDate = value => `"${value.toISOString()}"`;
        else if(options.date === "string") stringifyDate = value => `"${value.toString()}"`;
        else if(options.date === "utc") stringifyDate = value => `"${value.toUTCString()}"`;

        if(options.numberKey) numberKey = true;

        if(typeof options.replacer === "function") replacer = options.replacer;
        if(options.replacer instanceof Array) arrayReplacer = options.replacer;

        space = options.space;

        if(options.undef === false) undef = false;
      }
    }

    if(typeof options === "function") replacer = options;
    if(arrayReplacer) {
      const keys = ["", ...arrayReplacer.map(_ => (typeof _ === "number" && ! numberKey ? _.toString() : _)).filter(_ => typeof _ === "string" || (numberKey && typeof _ === "number"))];
      const symbol = Symbol();

      replacer = function(key, value) {
        return this instanceof Array ? value : keys.includes(key) ? value : symbol;
      };
    }
  }

  if(typeof space === "string" || (typeof space === "number" && space > 0)) {
    if(typeof space === "number") {
      let spc = "";

      for(let i = 1; i <= 10 && i <= space; ++i) spc += " ";
      space = spc;
    } else if(typeof space === "string") space = space.replace(/[^ \n\r\t]/g, "").substring(0, 10);

    newLine = "\n";
    valueSeparator = ": ";
  } else space = "";

  function stringify(value: unknown, currSpace: string, skip: number, override?: unknown): unknown {
    if(value === null) return "null";
    if(value === undefined) return undef ? "undefined" : undefined;

    switch(typeof value) {
    case "function":
    case "symbol":
      return undefined;
    case "boolean":
    case "number":
      return Object.is(value, -0) ? "-0" : value.toString();
    case "bigint":
      return value.toString() + "n";
    case "string":
      return JSON.stringify(value);
    }

    if(value instanceof ArrayBuffer) return undefined;

    if(value instanceof Date) return isNaN(value.getTime()) ? "new Date(NaN)" : `new Date(${stringifyDate(value)})`;

    if(value instanceof Int8Array) return value.length ? `new Int8Array([${value.toString()}])` : "new Int8Array()";

    if(value instanceof RegExp) {
      const [, exp, flags] = value.toString().match("/(.*)/(.*)")!;

      return `new RegExp(${JSON.stringify(exp)}${flags ? `,"${flags}"` : ""})`;
    }

    if(value instanceof URL) return `new URL(${JSON.stringify(value.toString())})`;

    if(value instanceof Uint8Array) return value.length ? `new Uint8Array([${value.toString()}])` : "new Uint8Array()";
    if(value instanceof Uint8ClampedArray) return value.length ? `new Uint8ClampedArray([${value.toString()}])` : "new Uint8ClampedArray()";

    if(ArrayBuffer.isView(value)) return undefined;

    const nextSpace = currSpace + space;

    if(value instanceof Error) {
      const id = (errors as unknown[]).indexOf(value.constructor);
      const constructor = id === -1 ? Error : errors[id];
      const replaced = replacer.call(value, "message", value.message);

      if(typeof replaced !== "string") throw new Error("The return value of replacer for an Error message must be a string");

      return `new ${constructor.name}(${JSON.stringify(replaced)})`;

      /* Valid from Node.js v16: need to be refactored
      const id = (errors as unknown[]).indexOf(value.constructor);
      const constructor = id === -1 ? Error : errors[id];
      const { cause } = value;
      const replaced = replacer.call(value, "message", value.message);

      if(typeof replaced !== "string") throw new Error("The return value of replacer for an Error message must be a string");

      return `new ${constructor.name}(${cause ? newLine + nextSpace : ""}${JSON.stringify(replaced)}${
        cause ? `,${newLine}${nextSpace}${stringify({ cause }, options, nextSpace, 0, value)}${newLine}${currSpace}` : ""
      })`;
      */
    }

    const elements = (array: unknown[], stringKey: boolean, skip: number) =>
      `[${newLine}${array
        .map((_, i) => {
          const replaced = skip === 1 ? _ : replacer.call(value, stringKey ? i.toString() : i, _);

          if(skip === 2 && (! (replaced instanceof Array) || replaced.length !== 2)) throw new Error("The return value of replacer for a Map entry must be a two elements Array");

          return stringify(replaced, nextSpace, skip ? skip - 1 : 0);
        })
        .map(_ => (_ === undefined ? null : _) as unknown)
        .map(_ => nextSpace + _)
        .join("," + newLine)}${newLine}${currSpace}]`;

    if(value instanceof Array) return value.length ? elements(value, ! numberKey, skip) : "[]";
    if(value instanceof Map) return value.size ? `new Map(${elements(Array.from(value), false, 2)})` : "new Map()";
    if(value instanceof Set) return value.size ? `new Set(${elements(Array.from(value), false, 0)})` : "new Set()";

    const entries = Object.entries(value)
      .map(([key, val]) => [key, stringify(replacer.call(override || value, key, val), nextSpace, 0)])
      .filter(_ => _[1] !== undefined);

    return entries.length ? `{${newLine}${entries.map(([key, val]) => `${nextSpace}"${key}"${valueSeparator}${val}`).join("," + newLine)}${newLine}${currSpace}}` : "{}";
  }

  return stringify(replacer.call({ "": value }, "", value), "", 0);
}

export const NJSON = { parse, stringify } as const;
