import { NJSONError, parse as parser } from "./parser";

export type NjsonFunction = (key: number | string, value: unknown) => unknown;
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
  if(typeof options === "function") options = { reviver: options };
  if(! options) options = {};

  try {
    const { numberKey, reviver } = options;
    let result = parser(text, { grammarSource: "", ...options });

    if(typeof reviver !== "function") return result;

    result = recursiveParse(result, reviver, numberKey || false);

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

function recursiveParse(value: unknown, reviver: NjsonFunction, numberKey: boolean, skip = 0) {
  if(value && typeof value === "object" && ! (value instanceof Date) && ! (value instanceof RegExp) && ! (value instanceof URL)) {
    if(value instanceof Array) {
      value.forEach((_, i) => {
        const val = recursiveParse(_, reviver, numberKey, skip ? skip - 1 : 0);

        value[i] = skip === 1 ? val : reviver.call(value, numberKey ? i : i.toString(), val);
      });
    } else if(value instanceof Map) {
      Array.from(value).forEach((_, i) => {
        const revived = reviver.call(value, i, recursiveParse(_, reviver, numberKey, 1));

        if(! (revived instanceof Array) || revived.length !== 2) throw new Error("The return value of reviver for a Map entry must be a two elements Array");

        const [key, val] = revived;

        if(key !== _[0]) value.delete(_[0]);
        value.set(key, val);
      });
    } else if(value instanceof Set) {
      const elements = Array.from(value);
      const { length } = elements;

      elements.forEach((_, i) => {
        const revived = reviver.call(value, i, recursiveParse(_, reviver, numberKey));

        if(revived !== _) {
          for(let l = i; l < length; ++l) value.delete(elements[l]);
          value.add(revived);
          for(let l = i + i; l < length; ++l) value.add(elements[l]);
        }
      });
    } else Object.entries(value).forEach(([key, val]) => ((value as Record<string, unknown>)[key] = reviver.call(value, key, recursiveParse(val, reviver, numberKey))));
  }

  return value;
}

export interface NjsonStringifyOpts {
  replacer?: NjsonReplacer;
  space?: string;
}

interface NjsonStringifyInternalOptions {
  date: (value: Date) => string;
  newLine: string;
  numberKey?: boolean;
  replacer: NjsonFunction;
  space: string;
  undef: boolean;
  valueSeparator: string;
}

function stringify(value: unknown, options?: NjsonStringifyOptions): string;
function stringify(value: unknown, replacer?: NjsonReplacer | null, space?: number | string): string;
function stringify(value: unknown, options?: NjsonStringifyOptions | NjsonReplacer | null, space?: number | string) {
  const internalOptions: NjsonStringifyInternalOptions = {
    date:           value => value.getTime().toString(),
    newLine:        "",
    replacer:       (_: number | string, value: unknown) => value,
    space:          "",
    undef:          true,
    valueSeparator: ":"
  };

  if(options) {
    let arrayReplacer: (number | string)[] | undefined = undefined;

    if(typeof options === "object") {
      if(options instanceof Array) arrayReplacer = options;
      else {
        if(options.date === "iso") internalOptions.date = value => `"${value.toISOString()}"`;
        if(options.date === "string") internalOptions.date = value => `"${value.toString()}"`;
        if(options.date === "utc") internalOptions.date = value => `"${value.toUTCString()}"`;

        if(options.numberKey) internalOptions.numberKey = true;

        if(typeof options.replacer === "function") internalOptions.replacer = options.replacer;
        if(options.replacer instanceof Array) arrayReplacer = options.replacer;

        space = options.space;

        if(options.undef === false) internalOptions.undef = false;
      }
    }

    if(typeof options === "function") internalOptions.replacer = options;
    if(arrayReplacer) {
      const { numberKey } = internalOptions;
      const keys = ["", ...arrayReplacer.map(_ => (typeof _ === "number" && ! numberKey ? _.toString() : _)).filter(_ => typeof _ === "string" || (numberKey && typeof _ === "number"))];
      const symbol = Symbol();

      internalOptions.replacer = function(key, value) {
        return this instanceof Array ? value : keys.includes(key) ? value : symbol;
      };
    }
  }

  if(typeof space === "string" || (typeof space === "number" && space > 0)) {
    if(typeof space === "number") for(let i = 1; i <= 10 && i <= space; ++i) internalOptions.space += " ";
    if(typeof space === "string") internalOptions.space = space.replace(/[^ \n\r\t]/g, "").substring(0, 10);

    internalOptions.newLine = "\n";
    internalOptions.valueSeparator = ": ";
  }

  return recursiveStringify(internalOptions.replacer.call({ "": value }, "", value), internalOptions, "");
}

function recursiveStringify(value: unknown, options: NjsonStringifyInternalOptions, space: string, skip = 0): unknown {
  if(value === null) return "null";
  if(value === undefined) return options.undef ? "undefined" : undefined;

  const type = typeof value;

  if(["function", "symbol"].includes(type)) return undefined;
  if(["boolean", "number"].includes(type)) return Object.is(value, -0) ? "-0" : (value as number).toString();
  if(type === "bigint") return (value as bigint).toString() + "n";
  if(type === "string") return JSON.stringify(value);

  if(value instanceof Date) return isNaN(value.getTime()) ? "new Date(NaN)" : `new Date(${options.date(value)})`;

  if(value instanceof RegExp) {
    const [, exp, flags] = value.toString().match("/(.*)/(.*)")!;

    return `new RegExp(${JSON.stringify(exp)}${flags ? `,"${flags}"` : ""})`;
  }

  if(value instanceof URL) return `new URL(${JSON.stringify(value.toString())})`;

  const nextSpace = space + options.space;
  const { newLine, numberKey, replacer, valueSeparator } = options;

  const elements = (array: unknown[], stringKey: boolean, skip = 0) =>
    `[${newLine}${array
      .map((_, i) => {
        const replaced = skip === 1 ? _ : replacer.call(value, stringKey ? i.toString() : i, _);

        if(skip === 2 && (! (replaced instanceof Array) || replaced.length !== 2)) throw new Error("The return value of replacer for a Map entry must be a two elements Array");

        return recursiveStringify(replaced, options, nextSpace, skip ? skip - 1 : 0);
      })
      .map(_ => (_ === undefined ? null : _) as unknown)
      .map(_ => nextSpace + _)
      .join("," + newLine)}${newLine}${space}]`;

  if(value instanceof Array) return value.length ? elements(value, ! numberKey, skip) : "[]";
  if(value instanceof Map) return value.size ? `new Map(${elements(Array.from(value), false, 2)})` : "new Map()";
  if(value instanceof Set) return value.size ? `new Set(${elements(Array.from(value), false)})` : "new Set()";

  const entries = Object.entries(value)
    .map(([key, val]) => [key, recursiveStringify(replacer.call(value, key, val), options, nextSpace)])
    .filter(_ => _[1] !== undefined);

  return entries.length ? `{${newLine}${entries.map(([key, val]) => `${nextSpace}"${key}"${valueSeparator}${val}`).join("," + newLine)}${newLine}${space}}` : "{}";
}

export const NJSON = { parse, stringify } as const;
