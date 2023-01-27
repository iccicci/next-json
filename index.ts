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
  stringLength?: number;
  undef?: boolean;
}

function parse<T = unknown>(text: string, options?: NjsonParseOptions): T;
function parse<T = unknown>(text: string, reviver?: NjsonFunction): T;
function parse<T = unknown>(text: string, options?: NjsonParseOptions | NjsonFunction) {
  try {
    const result = parser(text, { grammarSource: "", offset: 0, ...options });

    if(typeof options === "function") options = { reviver: options };
    if(! options) options = {};
    if(typeof options.reviver !== "function") return result;

    const { numberKey, reviver } = options;
    const references: unknown[] = [];

    function revive(context: unknown, key: number | string, value: unknown, skip?: boolean, skipNext?: boolean): unknown {
      if(value && typeof value === "object" && ! (value instanceof Date) && ! (value instanceof RegExp) && ! (value instanceof URL) && ! ArrayBuffer.isView(value) && references.indexOf(value) === -1) {
        references.push(value);

        if(value instanceof Array) value.forEach((_, i) => (value[i] = revive(value, numberKey ? i : i.toString(), _, skipNext)));
        else if(value instanceof Error) {
          const revived = revive(value, "message", value.message);

          Object.defineProperty(value, "message", { configurable: true, value: revived, writable: true });
        } else if(value instanceof Map) {
          const elements = Array.from(value);
          const { length } = elements;

          elements.forEach((_, i) => {
            const revived = revive(value, i, _, false, true);
            let remove = false;
            let replace = false;
            let key: unknown;
            let val: unknown;

            if(revived instanceof Array && revived.length === 2) {
              [key, val] = revived as [unknown, unknown];

              if(key !== _[0]) remove = replace = true;
              else value.set(key, val);
            } else remove = true;

            if(remove) {
              for(let l = i; l < length; ++l) value.delete(elements[l][0]);
              if(replace) value.set(key, val);
              for(let l = i + i; l < length; ++l) value.set(...elements[l]);
            }
          });
        } else if(value instanceof Set) {
          const elements = Array.from(value);
          const { length } = elements;

          elements.forEach((_, i) => {
            const revived = revive(value, i, _);

            if(revived !== _) {
              for(let l = i; l < length; ++l) value.delete(elements[l]);
              value.add(revived);
              for(let l = i + i; l < length; ++l) value.add(elements[l]);
            }
          });
        } else Object.entries(value).forEach(([key, val]) => ((value as Record<string, unknown>)[key] = revive(value, key, val)));
      }

      return skip ? value : reviver.call(context, key, value);
    }

    return revive({ "": result }, "", result) as T;
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

interface ReplacerRef {
  argument: () => boolean;
  elements?: unknown;
  exclude?: boolean;
  found?: boolean;
  identifier?: string;
  isReference: boolean;
  statements?: string[];
  stringified?: string;
  stringify: (space: string, body?: boolean, first?: boolean) => string;
}

function argumentDefault(this: ReplacerRef): boolean {
  if(this.identifier) return false;
  if((this.elements as ReplacerRef[]).some(_ => ! _.argument())) return false;

  return true;
}

function argumentObject(this: ReplacerRef): boolean {
  if(this.identifier) return false;
  if((this.elements as [string, ReplacerRef][]).some(_ => ! _[1].argument())) return false;

  return true;
}

function excludeRef(): ReplacerRef {
  function argument(): boolean {
    return true;
  }

  function stringify() {
    return "null";
  }

  return { argument, exclude: true, isReference: false, stringify };
}

function nativeRef(stringified: string): ReplacerRef {
  function argument(this: ReplacerRef): boolean {
    return ! this.identifier;
  }

  function stringify(this: ReplacerRef, _: string, body?: boolean) {
    return this.identifier && body ? this.identifier : this.stringified!;
  }

  return { argument, isReference: false, stringified, stringify };
}

function mapDefault(ref: ReplacerRef, nextSpace: string, body?: boolean) {
  return (ref.elements as ReplacerRef[]).map(_ => _.stringify(nextSpace, body));
}

const errors = [EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError];
const typedArrays = [BigInt64Array, BigUint64Array, Float32Array, Float64Array, Int8Array, Int16Array, Int32Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array];

function stringify(value: unknown, options?: NjsonStringifyOptions): string;
function stringify(value: unknown, replacer?: NjsonReplacer | null, space?: number | string): string;
function stringify(value: unknown, options?: NjsonStringifyOptions | NjsonReplacer | null, space?: number | string) {
  let newLine = "";
  let numberKey = false;
  let replacer: NjsonFunction | undefined;
  let stringLength: number | undefined = undefined;
  let stringifyDate: (value: Date) => string = value => value.getTime().toString();
  let undef = true;
  let separator = "";

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
        else if(options.replacer instanceof Array) arrayReplacer = options.replacer;

        space = options.space;

        if(typeof options.stringLength === "number") stringLength = options.stringLength;

        if(options.undef === false) undef = false;
      }
    }

    if(typeof options === "function") replacer = options;
    if(arrayReplacer) {
      const keys = ["", ...arrayReplacer.map(_ => (typeof _ === "number" && ! numberKey ? _.toString() : _)).filter(_ => typeof _ === "string" || (numberKey && typeof _ === "number"))];

      replacer = function(key, value) {
        return this instanceof Array ? value : keys.includes(key) ? value : parse;
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
    separator = " ";
  } else space = "";

  const letters: number[] = [];
  const references = new Map<unknown, ReplacerRef>();
  const indent = space;

  function getIdentifier() {
    const { length } = letters;

    for(let i = 0; i <= length; ++i) {
      if(i === length) for(let l = 0; l <= length; ++l) letters[l] = 0;
      else if(letters[i] === 25) letters[i] = 0;
      else {
        letters[i]++;
        break;
      }
    }

    return String.fromCharCode(...letters.map(_ => _ + 65).reverse());
  }

  function isReference(value: unknown) {
    switch(typeof value) {
    case "function":
    case "symbol":
      return true;
    case "object":
      return value;
    case "string":
      return stringLength !== undefined && value.length >= stringLength;
    }

    return false;
  }

  function mapObject(ref: ReplacerRef, nextSpace: string, body?: boolean) {
    return (ref.elements as [string, ReplacerRef][]).filter(_ => ! _[1].exclude).map(_ => `${JSON.stringify(_[0])}:${separator}${_[1].stringify(nextSpace, body)}`);
  }

  function create(type: typeof Array | typeof Map | typeof Object | typeof Set) {
    let argument = argumentDefault;
    let map: (ref: ReplacerRef, space: string, body?: boolean) => string[] = mapDefault;
    let parameter: (ref: ReplacerRef, stringify: (elements: string[]) => string, nextSpace: string) => string;
    let empty: string;
    let prefix: string;
    let suffix: string;

    switch(type) {
    case Array:
      parameter = (ref: ReplacerRef, stringify, nextSpace) => {
        const { elements } = ref as { elements: ReplacerRef[] };
        const args = elements.map(_ => _.argument());
        const last = args.reduce((last, _, i) => (_ ? i : last), -1);

        return stringify(
          (ref.elements as ReplacerRef[])
            .map((_, i) => {
              if(args[i]) return _.stringify(nextSpace);

              const statement = `${indent}${ref.identifier}[${i}]${separator}=${separator}${elements[i].stringify(indent, true)}`;

              if(! ref.statements) ref.statements = [statement];
              else ref.statements.push(statement);

              return "0";
            })
            .filter((_, i) => i <= last)
        );
      };

      empty = "[]";
      prefix = "[";
      suffix = "]";
      break;

    case Map:
      parameter = (ref, stringify, nextSpace) => {
        const { elements } = ref as { elements: ReplacerRef[] };
        const last = elements.findIndex(_ => ! _.argument());

        if(last !== -1) {
          ref.statements = [];

          for(let i = last; i < elements.length; ++i) {
            const stringified = elements[i].stringify(indent, true);

            ref.statements.push(`${indent}${ref.identifier}.set(${stringified.substring(1, stringified.length - 1)})`);
          }
        }

        return stringify((last === -1 ? elements : elements.filter((_, i) => i < last)).map(_ => _.stringify(nextSpace)));
      };

      empty = "new Map()";
      prefix = "new Map([";
      suffix = "])";
      break;

    case Object:
      parameter = (ref, stringify, nextSpace) => {
        const { elements } = ref as { elements: [string, ReplacerRef][] };

        return stringify(
          elements
            .filter(([key, value]) => {
              if(value.argument()) return true;

              const statement = `${indent}${ref.identifier}[${JSON.stringify(key)}]${separator}=${separator}${value.stringify(indent, true)}`;

              if(! ref.statements) ref.statements = [statement];
              else ref.statements.push(statement);

              return false;
            })
            .map(_ => `${JSON.stringify(_[0])}:${separator}${_[1].stringify(nextSpace)}`)
        );
      };

      argument = argumentObject;
      map = mapObject;
      empty = "{}";
      prefix = "{";
      suffix = "}";
      break;

    case Set:
      parameter = (ref, stringify, nextSpace) => {
        const { elements } = ref as { elements: ReplacerRef[] };
        const last = elements.findIndex(_ => ! _.argument());

        if(last !== -1) {
          ref.statements = [];

          for(let i = last; i < elements.length; ++i) ref.statements.push(`${indent}${ref.identifier}.add(${elements[i].stringify(indent, true)})`);
        }

        return stringify((last === -1 ? elements : elements.filter((_, i) => i < last)).map(_ => _.stringify(nextSpace)));
      };

      empty = "new Set()";
      prefix = "new Set([";
      suffix = "])";
    }

    function stringify(this: ReplacerRef, currSpace: string, body?: boolean, first?: boolean) {
      if(this.identifier && (body || ! first)) return this.identifier;

      const nextSpace = currSpace + indent;

      function stringify(elements: string[]) {
        return elements.length ? `${prefix}${newLine}${elements.map(_ => nextSpace + _).join("," + newLine)}${newLine}${currSpace}${suffix}` : empty;
      }

      return first ? parameter(this, stringify, nextSpace) : stringify(map(this, nextSpace, body));
    }

    return { argument, isReference: true, stringify };
  }

  function replace(context: unknown, key: number | string, value: unknown, skip?: boolean, skipNext?: boolean): ReplacerRef {
    function createRef(value: unknown): ReplacerRef {
      switch(typeof value) {
      case "function":
      case "symbol":
        return excludeRef();
      case "string":
        return nativeRef(JSON.stringify(value));
      }

      if(value instanceof Array) return { elements: value.map((_, i) => replace(value, numberKey ? i : i.toString(), _, skipNext)), ...create(Array) };

      if(value instanceof Date) return nativeRef(isNaN(value.getTime()) ? "new Date(NaN)" : `new Date(${stringifyDate(value)})`);

      if(value instanceof Error) {
        const id = errors.findIndex(_ => value instanceof _);
        const { name } = id === -1 ? Error : errors[id];
        const message = replace(value, "message", value.message);

        function argument(this: ReplacerRef) {
          return ! this.identifier;
        }

        function stringify(this: ReplacerRef, space: string, body?: boolean) {
          return this.identifier && body ? this.identifier : `new ${name}(${message.stringify(space + indent)})`;
        }

        return { argument, isReference: true, stringify };
      }

      if(value instanceof Map) {
        return {
          elements: Array.from(value)
            .map((_, i) => replace(value, i, _, false, true))
            .filter(_ => ! _.exclude),
          ...create(Map)
        };
      }

      if(value instanceof RegExp) {
        const [, exp, flags] = value.toString().match("/(.*)/(.*)")!;

        return nativeRef(`new RegExp(${JSON.stringify(exp)}${flags ? `,"${flags}"` : ""})`);
      }

      if(value instanceof Set) return { elements: Array.from(value).map((_, i) => replace(value, i, _)), ...create(Set) };

      if(value instanceof URL) return nativeRef(`new URL(${JSON.stringify(value.toString())})`);

      const id = typedArrays.findIndex(_ => value instanceof _);

      if(id !== -1) {
        const { name } = typedArrays[id];
        const bigint = value instanceof BigInt64Array || value instanceof BigUint64Array;
        const values = Array.from((value as Int8Array).values() as IterableIterator<unknown>)
          .map(_ => `${_}`)
          .join(bigint ? "n," : ",");

        return nativeRef(values.length ? `new ${name}([${values}${bigint ? "n" : ""}])` : `new ${name}()`);
      }

      return {
        elements: Object.entries(value as object)
          .map(_ => [_[0], replace(value, ..._)])
          .filter(_ => _[1]),
        ...create(Object)
      };
    }

    if(replacer && ! skip) value = replacer.call(context, key, value);
    if(skipNext && (! (value instanceof Array) || value.length !== 2)) return { exclude: true } as ReplacerRef;

    if(isReference(value)) {
      let ref = references.get(value);

      if(! ref) {
        references.set(value, (ref = {} as ReplacerRef));
        Object.assign(ref, createRef(value));
      }

      if(ref.found) {
        if(! (ref.exclude || ref.identifier)) ref.identifier = getIdentifier();
      } else ref.found = true;

      return ref;
    }

    switch(typeof value) {
    case "bigint":
      return nativeRef(value.toString() + "n");
    case "boolean":
    case "number":
      return nativeRef(Object.is(value, -0) ? "-0" : value.toString());
    case "object":
      return nativeRef("null");
    case "string":
      return nativeRef(JSON.stringify(value));
    case "undefined":
      if(undef) return nativeRef("undefined");
    }

    return excludeRef();
  }

  const replaced = replace({ "": value }, "", value);

  if(replaced.exclude) return undefined;

  const identifiers = Array.from(references.values())
    .filter(_ => _.identifier)
    .sort((a, b) => (a.identifier!.length < b.identifier!.length ? -1 : a.identifier!.length > b.identifier!.length ? 1 : a.identifier! < b.identifier! ? -1 : 1));

  if(! identifiers.length) return replaced.stringify("");

  const args = identifiers.map(_ => _.stringify(indent, false, true));
  const statements = identifiers.reduce<string[]>((statements, _) => (_.statements ? [...statements, ..._.statements] : statements), []);

  statements.push(`${indent}return ${replaced.stringify(indent, true)}`);

  return (
    `((${identifiers.map(_ => _.identifier).join("," + separator)})${separator}=>${separator}{${newLine}${statements.join(";" + newLine)}${newLine}})` +
    `(${newLine}${indent}${args.join(`,${newLine}${indent}`)}${newLine})`
  );
}

export const NJSON = { parse, stringify } as const;
