import { NJSONError, parse as parser } from "./parser";

export type NjsonFunction = (key: string, value: unknown) => unknown;
export type NjsonReplacer = NjsonFunction | (number | string)[];

export interface NjsonParseOptions {
  reviver?: NjsonReplacer;
}

export interface NjsonStringifyOptions {
  date?: "iso" | "string" | "time" | "utc";
  replacer?: NjsonReplacer;
  space?: number | string;
  undef?: boolean;
}

function parse<T = unknown>(text: string, reviver?: NjsonFunction): T;
function parse<T = unknown>(text: string, options?: NjsonParseOptions): T;
function parse<T = unknown>(text: string, options?: NjsonParseOptions | NjsonFunction) {
  if(typeof options === "function") options = { reviver: options };
  if(! options) options = {};

  try {
    let result = parser(text, { grammarSource: "", ...options });

    if(typeof options.reviver !== "function") return result;

    result = recursiveParse(result, options.reviver);

    return options.reviver.call({ "": result }, "", result) as T;
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

function recursiveParse(value: unknown, reviver: NjsonFunction) {
  if(value && typeof value === "object") {
    if(value instanceof Array) value.forEach((_, i) => (value[i] = reviver.call(value, i.toString(), recursiveParse(_, reviver))));
    else Object.entries(value).forEach(([key, val]) => ((value as Record<string, unknown>)[key] = reviver.call(value, key, recursiveParse(val, reviver))));
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
  replacer: NjsonFunction;
  space: string;
  undef: boolean;
  valueSeparator: string;
}

function stringify(value: unknown, replacer?: NjsonReplacer | null, space?: number | string): string;
function stringify(value: unknown, options?: NjsonStringifyOptions): string;
function stringify(value: unknown, options?: NjsonStringifyOptions | NjsonReplacer | null, space?: number | string) {
  const internalOptions: NjsonStringifyInternalOptions = {
    date:           value => value.getTime().toString(),
    newLine:        "",
    replacer:       (_: string, value: unknown) => value,
    space:          "",
    undef:          true,
    valueSeparator: ":"
  };

  if(options) {
    let arrayReplacer: (number | string)[] | undefined = undefined;

    if(typeof options === "object") {
      if(options instanceof Array) arrayReplacer = options;
      else {
        if(typeof options.replacer === "function") internalOptions.replacer = options.replacer;
        if(options.replacer instanceof Array) arrayReplacer = options.replacer;

        space = options.space;

        if(options.undef === false) internalOptions.undef = false;

        if(options.date === "iso") internalOptions.date = value => `"${value.toISOString()}"`;
        if(options.date === "string") internalOptions.date = value => `"${value.toString()}"`;
        if(options.date === "utc") internalOptions.date = value => `"${value.toUTCString()}"`;
      }
    }

    if(typeof options === "function") internalOptions.replacer = options;
    if(arrayReplacer) {
      const keys = ["", ...arrayReplacer.map(_ => (typeof _ === "number" ? _.toString() : _)).filter(_ => typeof _ === "string")];
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

function recursiveStringify(value: unknown, options: NjsonStringifyInternalOptions, space: string): unknown {
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

  const nextSpace = space + options.space;
  const { newLine, replacer, valueSeparator } = options;

  if(value instanceof Array) {
    const elements = value.map((_, i) => recursiveStringify(replacer.call(value, i.toString(), _), options, nextSpace)).map(_ => (_ === undefined ? null : _));

    return value.length ? `[${newLine}${elements.map(_ => nextSpace + _).join("," + newLine)}${newLine}${space}]` : "[]";
  }

  const entries = Object.entries(value)
    .map(([key, val]) => [key, recursiveStringify(replacer.call(value, key, val), options, nextSpace)])
    .filter(_ => _[1] !== undefined);

  return entries.length ? `{${newLine}${entries.map(([key, val]) => `${nextSpace}"${key}"${valueSeparator}${val}`).join("," + newLine)}${newLine}${space}}` : "{}";
}

export const NJSON = { parse, stringify } as const;
