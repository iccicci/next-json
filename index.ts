/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { NJSONError, parse as parser } from "./parser";

/** A function which can be used as `replacer` or `reviver`. */
export type NjsonFunction = (this: unknown, key: number | string, value: unknown) => unknown;

/** A function that transforms the results or the `Array` of _keys_ to be serialized. */
export type NjsonReplacer = NjsonFunction | (number | string)[];

/** NJSON parsing options. */
export interface NjsonParseOptions {
  /** If `true` the `key` argument passed to `reviver` is of type `number` when reviving an `Array`. */
  numberKey?: boolean;

  /**
   * A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is.
   */
  reviver?: NjsonFunction;
}

/** NJSON serializing options. */
export interface NjsonStringifyOptions {
  /** Specifies the method to be used to serialize `Date` objects. */
  date?: "iso" | "string" | "time" | "utc";

  /** If `true` the `key` argument passed to `replacer` is of type `number` when replacing an `Array`. */
  numberKey?: boolean;

  /** If `true` the `stack` is omitted when serializing `Error` objects. */
  omitStack?: boolean;

  /** A function that transforms the results or the `Array` of _keys_ to be serialized. */
  replacer?: NjsonReplacer;

  /** If `true` the _keys_ of objects are alphabetically sorted before being serialized. */
  sortKeys?: boolean;

  /** Adds indentation, white space, and line break characters to the return-value NJSON text to make it easier to read. */
  space?: number | string;

  /** When a `string` is longer than `stringLength` characters it is considered a reference. */
  stringLength?: number;

  /** If `false`, `undefined` values ar skipped (as JSON.stringify does). */
  undef?: boolean;
}

class EmptyError extends Error {
  constructor() {
    super("");
  }
}

/**
 * A symbol used to indicate an empty value in an `Array`.
 *
 * If a `replacer` or a `reviver` function returns this symbol outside of an `Array` `context`,
 * an `Error` is thrown.
 */
const empty = Symbol("empty");

/**
 * Converts a Next JavaScript Object Notation (NJSON) string into an object.
 *
 * @param text A valid NJSON string.
 * @param options A `NjsonParseOptions` specifying the parsing options.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function parse<T = unknown>(text: string, options?: NjsonParseOptions): T;

/**
 * Converts a Next JavaScript Object Notation (NJSON) string into an object.
 *
 * @param text A valid NJSON string.
 * @param reviver A function that transforms the results. This function is called for each member of the object.
 * If a member contains nested objects, the nested objects are transformed before the parent object is.
 */
// eslint-disable-next-line @typescript-eslint/unified-signatures, @typescript-eslint/no-unnecessary-type-parameters
function parse<T = unknown>(text: string, reviver?: NjsonFunction): T;

function parse<T = unknown>(text: string, options?: NjsonParseOptions | NjsonFunction): T {
  try {
    if(typeof options === "function") options = { reviver: options };
    if(! options) options = {};

    const result = parser(text, { grammarSource: "", offset: 0, ...options }) as unknown as T;

    if(typeof options.reviver !== "function") return result;

    const { numberKey, reviver } = options;
    const references: unknown[] = [];

    const revive = function(context: unknown, key: number | string, value: unknown, skip?: boolean, skipNext?: boolean): unknown {
      if(value && typeof value === "object" && ! (value instanceof Date) && ! (value instanceof RegExp) && ! (value instanceof URL) && ! ArrayBuffer.isView(value) && ! references.includes(value)) {
        references.push(value);

        if(Array.isArray(value))
          for(const [i, _] of value.entries()) {
            const revived = revive(value, numberKey ? i : i.toString(), _, skipNext);

            // eslint-disable-next-line @typescript-eslint/no-array-delete
            if(revived === empty) delete value[i];
            else value[i] = revived;
          }
        else if(value instanceof Error) {
          const revived = revive(value, "message", value.message);

          Object.defineProperty(value, "message", { configurable: true, value: revived, writable: true });
        } else if(value instanceof Map) {
          const elements = Array.from(value);
          const { length } = elements;

          for(const [i, _] of elements.entries()) {
            const revived = revive(value, i, _, false, true);
            let remove = false;
            let replace = false;
            let key: unknown;
            let val: unknown;

            if(Array.isArray(revived) && revived.length === 2) {
              [key, val] = revived as [unknown, unknown];

              if(key !== _[0]) remove = replace = true;
              else value.set(key, val);
            } else remove = true;

            if(remove) {
              for(let l = i; l < length; ++l) value.delete(elements[l][0]);
              if(replace) value.set(key, val);
              for(let l = i + i; l < length; ++l) value.set(...elements[l]);
            }
          }
        } else if(value instanceof Set) {
          const elements = Array.from(value);
          const { length } = elements;

          for(const [i, _] of elements.entries()) {
            const revived = revive(value, i, _);

            if(revived !== _) {
              for(let l = i; l < length; ++l) value.delete(elements[l]);
              value.add(revived);
              for(let l = i + i; l < length; ++l) value.add(elements[l]);
            }
          }
        } else for(const [key, val] of Object.entries(value)) (value as Record<string, unknown>)[key] = revive(value, key, val);
      }

      if(skip) return value;

      value = reviver.call(context, key, value);

      if(value === empty && ! Array.isArray(context)) throw new EmptyError();

      return value;
    };

    return revive({ "": result }, "", result) as T;
  } catch(e) {
    if(e instanceof NJSONError) {
      const err = new SyntaxError(e.format([]).substring(7).replace(".\n at :", " at "));
      const [first, , ...rest] = err.stack!.split("\n");

      Object.defineProperty(err, "stack", { value: [first, ...rest].join("\n") });

      throw err;
    }

    if(e instanceof EmptyError) {
      const err = new TypeError("NJSON.empty can be used only in an Array context");
      const [first, , ...rest] = err.stack!.split("\n");

      Object.defineProperty(err, "stack", { value: [first, ...rest].join("\n") });

      throw err;
    }

    throw e;
  }
}

interface ReplacerRef {
  already?: boolean;
  argument: () => boolean;
  elements?: unknown;
  empty?: boolean;
  exclude?: boolean;
  found?: boolean;
  identifier?: string;
  main?: boolean;
  stringified?: string;
  stringify: (currIndent: string, body?: boolean, arg?: boolean) => string;
}

const argument = function(this: ReplacerRef): boolean {
  if(this.identifier) return false;
  if((this.elements as ReplacerRef[]).some(_ => ! _.argument())) return false;

  return true;
};

const excludeRef = () => ({ argument: () => true, exclude: true, stringify: () => "null" });

const nativeRef = function(stringified: string) {
  const argument = function(this: ReplacerRef): boolean {
    return ! this.identifier;
  };

  const stringify = function(this: ReplacerRef, _: string, body?: boolean) {
    return this.identifier && body ? this.identifier : this.stringified!;
  };

  return { argument, stringified, stringify };
};

const errors = [EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError];
const typedArrays = [BigInt64Array, BigUint64Array, Float32Array, Float64Array, Int8Array, Int16Array, Int32Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array];

/**
 * Converts a JavaScript value to a Next JavaScript Object Notation (NJSON) string.
 *
 * @param value A JavaScript value, any value, to be converted.
 * @param options A `NjsonStringifyOptions` specifying the serializing options.
 */
function stringify(value: unknown, options?: NjsonStringifyOptions): string;

/**
 * Converts a JavaScript value to a Next JavaScript Object Notation (NJSON) string.
 *
 * @param value A JavaScript value, any value, to be converted.
 * @param replacer A function that transforms the results or the `Array` of _keys_ to be serialized.
 * @param space Adds indentation, white space, and line break characters to the return-value NJSON text to make it easier to read.
 */
function stringify(value: unknown, replacer?: NjsonReplacer | null, space?: number | string): string;

function stringify(value: unknown, options?: NjsonStringifyOptions | NjsonReplacer | null, space?: number | string) {
  let newLine = "";
  let numberKey = false;
  let omitStack = false;
  let replacer: NjsonFunction | undefined;
  let separator = "";
  let sortKeys = false;
  let stringLength: number | undefined = undefined;
  let stringifyDate: (value: Date) => string = value => value.getTime().toString();
  let undef = true;

  if(options) {
    let arrayReplacer: (number | string)[] | undefined = undefined;

    if(typeof options === "object")
      if(Array.isArray(options)) arrayReplacer = options;
      else {
        if(options.date === "iso") stringifyDate = value => `"${value.toISOString()}"`;
        else if(options.date === "string") stringifyDate = value => `"${value.toString()}"`;
        else if(options.date === "utc") stringifyDate = value => `"${value.toUTCString()}"`;

        if(options.numberKey) numberKey = true;
        if(typeof options.stringLength === "number") stringLength = options.stringLength;
        if(options.omitStack === true) omitStack = true;
        if(options.sortKeys === true) sortKeys = true;
        if(options.undef === false) undef = false;

        if(typeof options.replacer === "function") replacer = options.replacer;
        else if(Array.isArray(options.replacer)) arrayReplacer = options.replacer;

        space = options.space;
      }

    if(typeof options === "function") replacer = options;
    if(arrayReplacer) {
      const keys = ["", ...arrayReplacer.map(_ => (typeof _ === "number" && ! numberKey ? _.toString() : _)).filter(_ => typeof _ === "string" || (numberKey && typeof _ === "number"))];

      replacer = function(key, value) {
        return Array.isArray(this) ? value : keys.includes(key) ? value : parse;
      };
    }
  }

  if(typeof space === "string" || (typeof space === "number" && space > 0)) {
    if(typeof space === "number") {
      let spc = "";

      for(let i = 1; i <= 10 && i <= space; ++i) spc += " ";
      space = spc;
    } else space = space.replace(/[^ \n\r\t]/g, "").substring(0, 10);

    newLine = "\n";
    separator = " ";
  } else space = "";

  const letters: number[] = [];
  const references = new Map<unknown, ReplacerRef>();
  const indent = space;

  const getIdentifier = function() {
    const { length } = letters;

    for(let i = 0; i <= length; ++i)
      if(i === length) for(let l = 0; l <= length; ++l) letters[l] = 0;
      else if(letters[i] === 25) letters[i] = 0;
      else {
        letters[i]++;
        break;
      }

    return String.fromCharCode(...letters.map(_ => _ + 65).reverse());
  };

  const isReference = function(value: unknown) {
    switch(typeof value) {
    case "function":
    case "symbol":
      return value !== empty;
    case "object":
      return value;
    case "string":
      return stringLength !== undefined && value.length >= stringLength;
    }

    return false;
  };

  const replace = function(context: unknown, key: number | string, value: unknown, skip?: boolean, skipNext?: boolean): ReplacerRef {
    if(replacer && ! skip) value = replacer.call(context, key, value);
    if(value === empty && ! Array.isArray(context)) throw new EmptyError();
    if(skipNext && (! Array.isArray(value) || value.length !== 2)) return { exclude: true } as ReplacerRef;

    if(isReference(value)) {
      let ref = references.get(value);

      if(! ref) {
        let rest: ReplacerRef;

        references.set(value, (ref = {} as ReplacerRef));

        switch(typeof value) {
        case "function":
        case "symbol":
          rest = excludeRef();
          break;

        case "string":
          rest = nativeRef(JSON.stringify(value));
          break;

        default:
          if(value instanceof Date) {
            rest = nativeRef(isNaN(value.getTime()) ? "new Date(NaN)" : `new Date(${stringifyDate(value)})`);
            break;
          }

          if(value instanceof Map) {
            const elements: ReplacerRef[] = [];
            let args: ReplacerRef[] = [];
            let elems = elements;

            for(const [i, _] of Array.from(value).entries()) {
              const replaced = replace(value, i, _, false, true);

              if(! replaced.exclude) elements.push(replaced);
            }

            const stringify = function(this: ReplacerRef, currIndent: string, body?: boolean, arg?: boolean) {
              if(this.already && this.identifier && body) return this.identifier;

              if(arg) {
                const set = elements.findIndex(_ => ! _.argument());

                if(set !== -1) {
                  elems = elements.slice(0, set);
                  args = elements.slice(set, elements.length);
                }
              }

              const nextIndent = currIndent + indent;

              if(! this.already && this.identifier && body) {
                this.already = true;

                return args.length
                  ? `${this.identifier}${newLine}${args
                    .map(_ => {
                      const stringified = _.stringify(nextIndent, true);

                      return `${nextIndent}.set(${stringified.substring(1, stringified.length - 1)})`;
                    })
                    .join(newLine)}`
                  : this.identifier;
              }

              return elems.length ? `new Map([${newLine}${elems.map(_ => nextIndent + _.stringify(nextIndent, body)).join(`,${newLine}`)}${newLine}${currIndent}])` : "new Map()";
            };

            rest = { argument, elements, stringify };
            break;
          }

          if(value instanceof RegExp) {
            const [, exp, flags] = value.toString().match("/(.*)/(.*)")!;

            rest = nativeRef(`new RegExp(${JSON.stringify(exp)}${flags ? `,"${flags}"` : ""})`);
            break;
          }

          if(value instanceof Set) {
            const elements: ReplacerRef[] = [];
            let args: ReplacerRef[] = [];
            let elems = elements;

            for(const [i, _] of Array.from(value).entries()) elements.push(replace(value, i, _));

            const stringify = function(this: ReplacerRef, currIndent: string, body?: boolean, arg?: boolean) {
              if(this.already && this.identifier && body) return this.identifier;

              if(arg) {
                const add = elements.findIndex(_ => ! _.argument());

                if(add !== -1) {
                  elems = elements.slice(0, add);
                  args = elements.slice(add, elements.length);
                }
              }

              const nextIndent = currIndent + indent;

              if(! this.already && this.identifier && body) {
                this.already = true;

                return args.length ? `${this.identifier}${newLine}${args.map(_ => `${nextIndent}.add(${_.stringify(nextIndent, true)})`).join(newLine)}` : this.identifier;
              }

              return elems.length ? `new Set([${newLine}${elems.map(_ => nextIndent + _.stringify(nextIndent, body)).join(`,${newLine}`)}${newLine}${currIndent}])` : "new Set()";
            };

            rest = { argument, elements, stringify };
            break;
          }

          if(value instanceof URL) {
            rest = nativeRef(`new URL(${JSON.stringify(value.toString())})`);
            break;
          }

          // eslint-disable-next-line no-case-declarations
          const id = typedArrays.findIndex(_ => value instanceof _);

          if(id !== -1) {
            const { name } = typedArrays[id];
            const bigint = value instanceof BigInt64Array || value instanceof BigUint64Array;
            const float = value instanceof Float32Array || value instanceof Float64Array;
            const stringified = float ? Array.from(value as Float32Array | Float64Array, _ => (Object.is(_, -0) ? "-0" : _.toString())).join(",") : typedArrays[id].prototype.toString.call(value);

            rest = nativeRef(stringified.length ? `new ${name}([${bigint ? `${stringified.replace(/,/g, "n,")}n` : stringified}])` : `new ${name}()`);
          } else {
            const args: [string, ReplacerRef][] = [];
            const elements: [string, ReplacerRef][] = [];
            let elems = elements;

            const argument = function(this: ReplacerRef): boolean {
              if(this.identifier) return false;
              if((this.elements as [string, ReplacerRef][]).some(_ => ! _[1].argument())) return false;

              return true;
            };

            const baseStringify = function(this: ReplacerRef, currIndent: string, body?: boolean, arg?: boolean) {
              if(this.already && this.identifier && body) return this.identifier;

              if(arg) {
                elems = [];

                for(const _ of elements) (_[1].argument() ? elems : args).push(_);
              }

              if(! this.already && this.identifier && body) {
                this.already = true;

                if(args.length) {
                  const nextIndent = currIndent + indent;
                  const nextNextIndent = nextIndent + indent;

                  return `Object.assign(${newLine}${nextIndent}${this.identifier},${newLine}${nextIndent}{${newLine}${args
                    .map(_ => `${nextNextIndent}${JSON.stringify(_[0])}:${separator}${_[1].stringify(nextNextIndent, true)}`)
                    .join(`,${newLine}`)}${newLine}${nextIndent}}${newLine}${currIndent})`;
                }

                return this.identifier;
              }

              return false;
            };

            if(Array.isArray(value)) {
              for(const [i, _] of value.entries()) {
                const key = i.toString();

                elements.push([key, replace(value, numberKey ? i : key, Object.hasOwn(value, key) ? _ : empty, skipNext)]);
              }

              const stringify = function(this: ReplacerRef, currIndent: string, body?: boolean, arg?: boolean) {
                const base = baseStringify.call(this, currIndent, body, arg);

                if(base) return base;

                let assign = false;
                const nextIndent = currIndent + indent;
                let idx = 0;
                const stringified = elements.map((_, i) => {
                  if(elems.length > idx && elems[idx][0] === i.toString()) {
                    idx++;

                    return nextIndent + _[1].stringify(nextIndent, body);
                  }

                  return nextIndent;
                });

                if(args.length) {
                  let ignore: boolean;
                  let irrelevant: boolean;
                  let i = elements.length - 1;
                  let l = args.length - 1;

                  do {
                    ignore = false;
                    irrelevant = false;

                    if(i >= 0)
                      if(l >= 0 && elements[i][0] === args[l][0]) ignore = true;
                      else if(assign && elements[i][1].empty) irrelevant = true;

                    if(ignore || irrelevant) {
                      stringified.pop();
                      assign = true;
                      i--;
                      if(ignore) l--;
                    }
                  } while(ignore || irrelevant);
                }

                return elems.length ? `[${newLine}${stringified.join(`,${newLine}`)}${elems.length && elems[elems.length - 1][1].empty && ! assign ? "," : ""}${newLine}${currIndent}]` : "[]";
              };

              rest = { argument, elements, stringify };
              break;
            }

            const entries = Object.entries(value as object);

            if(sortKeys) entries.sort((a, b) => (a[0] < b[0] ? -1 : 1));

            if(value instanceof Error) {
              const id = errors.findIndex(_ => value instanceof _);
              const error = id === -1 ? Error : errors[id];
              const cause = value.cause ? replace(value, "cause", value.cause) : undefined;
              const message = replace(value, "message", value.message);
              const name = value.name !== error.name ? replace(value, "name", value.name) : undefined;
              const stack = omitStack ? undefined : replace(value, "stack", value.stack);
              let anyway = false;

              if(cause && ! cause.exclude) elements.push(["cause", cause]);
              if(name && ! name.exclude) elements.push(["name", name]);
              if(stack && ! stack.exclude) elements.push(["stack", stack]);

              for(const [key, val] of entries)
                if(! ["cause", "message", "name", "stack"].includes(key)) {
                  const replaced = replace(value, key, val);

                  if(! replaced.exclude) elements.push([key, replaced]);
                }

              const stringify = function(this: ReplacerRef, currIndent: string, body?: boolean, arg?: boolean) {
                if(this.already && this.identifier && body) return this.identifier;

                if(arg) {
                  const notArgument = message && ! message.argument();

                  anyway = elements.findIndex(_ => ! _[1].argument()) !== -1 || notArgument;

                  if(anyway && notArgument) {
                    const cause = elements.length && elements[0][0] === "cause" ? elements.shift() : undefined;

                    elements.unshift(["message", message]);

                    if(cause) elements.unshift(cause);
                  }
                }

                const nextIndent = currIndent + indent;
                const nextNextIndent = nextIndent + indent;

                const construct = (indent: string) => `new ${error.name}(${! message || message.exclude || (arg && ! message.argument()) ? '""' : message.stringify(indent, body)})`;

                const assign = () =>
                  `Object.assign(${newLine}${nextIndent}${this.identifier && body ? this.identifier : construct(nextNextIndent)},${newLine}${nextIndent}{${newLine}${elements
                    .map(_ => `${nextNextIndent}${JSON.stringify(_[0])}:${separator}${_[1].stringify(nextNextIndent, body)}`)
                    .join(`,${newLine}`)}${newLine}${nextIndent}}${newLine}${currIndent})`;

                if(! this.already && this.identifier && body) {
                  this.already = true;

                  return anyway ? assign() : this.identifier;
                }

                return elements.length === 0 || anyway ? construct(nextIndent) : assign();
              };

              rest = { argument, elements, stringify };
              break;
            }

            for(const [key, val] of entries) {
              const replaced = replace(value, key, val);

              if(! replaced.exclude) elements.push([key, replaced]);
            }

            const stringify = function(this: ReplacerRef, currIndent: string, body?: boolean, arg?: boolean) {
              const base = baseStringify.call(this, currIndent, body, arg);

              if(base) return base;

              const wrapped = this.main && body;
              const open = wrapped ? "(" : "";
              const close = wrapped ? ")" : "";
              const nextIndent = currIndent + indent;

              return elems.length
                ? `${open}{${newLine}${elems.map(_ => `${nextIndent}${JSON.stringify(_[0])}:${separator}${_[1].stringify(nextIndent, body)}`).join(`,${newLine}`)}${newLine}${currIndent}}${close}`
                : "{}";
            };

            rest = { argument, elements, stringify };
          }
        }

        Object.assign(ref, rest);
      }

      if(ref.found) {
        if(! (ref.exclude || ref.identifier)) ref.identifier = getIdentifier();
      } else ref.found = true;

      return ref;
    }

    switch(typeof value) {
    case "bigint":
      return nativeRef(`${value.toString()}n`);
    case "boolean":
    case "number":
      return nativeRef(Object.is(value, -0) ? "-0" : value.toString());
    case "object":
      return nativeRef("null");
    case "string":
      return nativeRef(JSON.stringify(value));
    case "symbol":
      return { argument: () => true, empty: true, stringify: () => "" };
    case "undefined":
      if(undef) return nativeRef("undefined");
    }

    return excludeRef();
  };

  let replaced: ReplacerRef;

  try {
    replaced = replace({ "": value }, "", value);
  } catch(e) {
    if(e instanceof EmptyError) {
      const err = new TypeError("NJSON.empty can be used only in an Array context");
      const [first, , ...rest] = err.stack!.split("\n");
      Object.defineProperty(err, "stack", { value: [first, ...rest].join("\n") });
      throw err;
    }

    throw e;
  }

  if(replaced.exclude) return undefined;

  replaced.main = true;

  const identifiers = Array.from(references.values())
    .filter(_ => _.identifier)
    .sort((a, b) => (a.identifier!.length < b.identifier!.length ? -1 : a.identifier!.length > b.identifier!.length ? 1 : a.identifier! < b.identifier! ? -1 : 1));

  if(! identifiers.length) return replaced.stringify("");

  const args = identifiers.map(_ => _.stringify(indent, false, true));

  return (
    `((${identifiers.map(_ => _.identifier).join(`,${separator}`)})${separator}=>${newLine}${indent}${replaced.stringify(indent, true)}${newLine})` +
    `(${newLine}${indent}${args.join(`,${newLine}${indent}`)}${newLine})`
  );
}

/** Next JavaScript Object Notation. */
export const NJSON = { empty, parse, stringify } as const;

declare global {
  namespace Express {
    interface Response {
      /**
       * Sends NJSON response.
       *
       * @param body A value sent as body.
       * @param options A `NjsonStringifyOptions` specifying the body serializing options; defaults to `ExpressNjsonOptions.stringify` passed to `expressNJSON`.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      njson(body?: any, options?: NjsonStringifyOptions): Promise<unknown>;
    }
  }

  interface Response {
    /**
     * Parses the response body with `NJSON.parse`.
     *
     * @param options A `NjsonParseOptions` specifying the body parsing options; defaults to `options` passed to `fetchNJSON`.
     */
    readonly njson: (options?: NjsonParseOptions) => Promise<unknown>;
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/** `expressNJSON` middleware options. */
export interface ExpressNjsonOptions {
  /** A `NjsonParseOptions` specifying the body parsing options. */
  parse?: NjsonParseOptions;

  /** A `NjsonStringifyOptions` specifying the body serializing options; can be overridden while calling `res.njson()`. */
  stringify?: NjsonStringifyOptions;
}

/**
 * An Express middleware which works as NJSON body parser and installs the `Express.Response.njson` method.
 *
 * @param options A `ExpressNjsonOptions` specifying the options to be used while serializing and parsing bodies.
 */
export const expressNJSON = function(options: ExpressNjsonOptions = {}) {
  const { parse, stringify } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function(req: any, res: any, next: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.njson = function njson(this: any, body?: unknown, options?: NjsonStringifyOptions) {
      this.set({ "Content-Type": "application/njson" });
      this.end(NJSON.stringify(body, options || stringify));
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if(req._body || req.headers["content-type"] !== "application/njson") return next();

    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        req.body = NJSON.parse(Buffer.concat(chunks).toString(req.headers["content-encoding"] || "utf8"), parse);
        req._body = true;
        next();
      } catch(error) {
        next(error);
      }
    });
  };
};

/**
 * Installs the `Response.njson` method.
 *
 * @param options The default `NjsonParseOptions` specifying the body parsing options.
 */
export const fetchNJSON = function(options?: NjsonParseOptions) {
  const _options = options;

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  Response?.prototype &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((Response.prototype as any).njson = async function njson(this: Response, options?: NjsonParseOptions) {
      try {
        return NJSON.parse(await this.text(), options || _options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch(error: any) {
        const { stack } = error;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [first, _, ...rest] = stack.split("\n");
        Object.defineProperty(error, "stack", { configurable: true, enumerable: false, value: [first, ...rest].join("\n") });
        throw error;
      }
    });
};
