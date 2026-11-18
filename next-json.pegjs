// NJSON Next-JSON Grammar
// Based on https://github.com/peggyjs/peggy/blob/main/examples/json.pegjs

{
  const typedArrayConstructors: Record<string, new (arg?: ArrayBuffer | ArrayLike<bigint | number>) => ArrayBufferView> = {
    BigInt64Array,
    BigUint64Array,
    Float32Array,
    Float64Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint8Array,
    Uint8ClampedArray,
    Uint16Array,
    Uint32Array
  };

  if(typeof Float16Array === "function") typedArrayConstructors.Float16Array = Float16Array;

  function makeTypedArray(name: string, arg?: ArrayBuffer | ArrayLike<bigint | number> | string) {
    const Ctor = typedArrayConstructors[name];

    if(typeof Ctor !== "function") throw new TypeError(`${name} is not supported in this environment`);

    return new Ctor(! arg ? undefined : typeof arg === "string" ? Uint8Array.fromBase64(arg).buffer : arg);
  }
}

NJSON = wss @(value / function)

ws  "white space"  = [ \t\n\r] / "//" [^\n]* [\n] / "/*" (!"*/" .)* "*/"
wss "white spaces" = ws*
comma              = "," wss
dot                = "." wss
open_round         = "(" wss
closed_round       = ")" wss
open_square        = "[" wss
closed_square      = "]" wss
open_brace         = "{" wss
closed_brace       = "}" wss

value = @(array / bigint / chain / constructor / false / null / number / object / object_assign / string / true / undefined) wss

false     = "false"     { return false;     }
null      = "null"      { return null;      }
true      = "true"      { return true;      }
undefined = "undefined" { return undefined; }

object = open_brace entries:(head:entry tail:(comma @entry)* comma? { return Object.fromEntries([head, ...tail]); })? closed_brace { return entries || {}; }
entry  = name:string wss ":" wss value:value { return [name, value]; }

value_or_empty = (value:value { return { value }; }) / (wss { return { empty: true }; })

array = open_square values:(head:value_or_empty tail:(comma @value_or_empty)* { return [head, ...tail] })? closed_square
  {
    if(! values) return [];

    if(values.length && values[values.length - 1].empty) values.pop();

    const arr = new Array(values.length);

    for(let i = 0; i < values.length; i++) if(! values[i].empty) arr[i] = values[i].value;

    return arr;
  }

bigint "bigint" = natural:natural "n" { return BigInt(natural); }

number "number" = "NaN" { return NaN; } / "Infinity" { return Infinity; } / "-Infinity" { return -Infinity; } / float

float = natural ("." decimal+)? ([eE] [-+]? decimal+)? { return parseFloat(text()); }

integer = "0" / ([1-9] decimal*) { return text(); }
natural = "-"? integer           { return text(); }
decimal = [0-9]

string "string" = '"' chars:char* escaped_new_line '"' { return chars.join(""); }

char = escaped_new_line @([^\0-\x1F"\\] / "\\" @(
  "b" { return "\b"; } /
  "f" { return "\f"; } /
  "n" { return "\n"; } /
  "r" { return "\r"; } /
  "t" { return "\t"; } /
  "u" digits:$(hexadecimal hexadecimal hexadecimal hexadecimal) { return String.fromCharCode(parseInt(digits, 16)); } /
  "x" digits:$(hexadecimal hexadecimal) { return String.fromCharCode(parseInt(digits, 16)); } /
  [^\0-\x1F]
))

escaped_new_line = ("\\\r\n" / "\\\r" / "\\\n")*

hexadecimal = digit:.
  {
    if(digit.match(/[0-9a-f]/i)) return digit;

    throw peg$buildSimpleError("Invalid Unicode escape sequence.", location());
  }

constructor = "new" ws wss @(date / error / map / regexp / set / typed_array / url)

date = "Date" wss open_round time:(value:(number / string) { return { location: location(), value }; }) wss closed_round
  {
    const { value } = time as { value: number | string };

    if(typeof value === "number" && isNaN(value)) return new Date(NaN);

    const date = new Date(value);

    if(isNaN(date.getTime())) throw peg$buildSimpleError("Invalid date.", time.location);

    return date;
  }

regexp =
  "RegExp" wss open_round
  exp:(value:string { return { location: location(), value }; })
  flags:(comma @(value:string { return { location: location(), value }; }))?
  closed_round
  {
    try {
      return flags ? new RegExp(exp.value, flags.value) : new RegExp(exp.value);
    } catch(e: any) {
      const { message } = e;

      throw peg$buildSimpleError(message + ".", message.match("Invalid flags") ? flags.location : exp.location);
    }
  }

url = "URL" wss open_round url:(value:string { return { location: location(), value }; }) closed_round
  {
    try {
      return new URL(url.value);
    } catch(e: any) {
      const { message } = e;

      throw peg$buildSimpleError(message + ".", url.location);
    }
  }

set = "Set" wss open_round elements:array? closed_round { return new Set(elements || []); }

map = "Map" wss open_round elements:array_map_entry? closed_round { return new Map(elements || []); }

map_entry       = open_square key:value comma value:value closed_square { return [key, value]; }
array_map_entry = open_square values:(head:map_entry tail:(comma @map_entry)* { return [head, ...tail]; })? closed_square { return values || []; }

typed_array =
  "Int8Array"         wss open_round arg:(typed_array_buffer / natural_array)? closed_round { return makeTypedArray("Int8Array", arg);         } /
  "Uint8Array"        wss open_round arg:(typed_array_buffer / integer_array)? closed_round { return makeTypedArray("Uint8Array", arg);        } /
  "Uint8ClampedArray" wss open_round arg:(typed_array_buffer / integer_array)? closed_round { return makeTypedArray("Uint8ClampedArray", arg); } /
  "Int16Array"        wss open_round arg:(typed_array_buffer / natural_array)? closed_round { return makeTypedArray("Int16Array", arg);        } /
  "Uint16Array"       wss open_round arg:(typed_array_buffer / integer_array)? closed_round { return makeTypedArray("Uint16Array", arg);       } /
  "Int32Array"        wss open_round arg:(typed_array_buffer / natural_array)? closed_round { return makeTypedArray("Int32Array", arg);        } /
  "Uint32Array"       wss open_round arg:(typed_array_buffer / integer_array)? closed_round { return makeTypedArray("Uint32Array", arg);       } /
  "Float16Array"      wss open_round arg:(typed_array_buffer / number_array)?  closed_round { return makeTypedArray("Float16Array", arg);      } /
  "Float32Array"      wss open_round arg:(typed_array_buffer / number_array)?  closed_round { return makeTypedArray("Float32Array", arg);      } /
  "Float64Array"      wss open_round arg:(typed_array_buffer / number_array)?  closed_round { return makeTypedArray("Float64Array", arg);      } /
  "BigInt64Array"     wss open_round arg:(typed_array_buffer / bigint_array)?  closed_round { return makeTypedArray("BigInt64Array", arg);     } /
  "BigUint64Array"    wss open_round arg:(typed_array_buffer / bigint_array)?  closed_round { return makeTypedArray("BigUint64Array", arg);    }

typed_array_buffer =
  "Uint8Array" wss dot "fromBase64" wss open_round b64:string closed_round wss dot "buffer" wss { return b64; }

bigint_array  = open_square values:(head:bigint wss     tail:(comma @bigint wss    )* { return [head, ...tail]; })? closed_square { return values || []; }
number_array  = open_square values:(head:number wss     tail:(comma @number wss    )* { return [head, ...tail]; })? closed_square { return values || []; }
integer_array = open_square values:(head:parsed_integer tail:(comma @parsed_integer)* { return [head, ...tail]; })? closed_square { return values || []; }
natural_array = open_square values:(head:parsed_natural tail:(comma @parsed_natural)* { return [head, ...tail]; })? closed_square { return values || []; }

parsed_integer = integer:integer wss { return parseFloat(integer); }
parsed_natural = natural:natural wss { return parseFloat(natural); }

object_assign = "Object" wss dot "assign" wss open_round dest:value comma source:value closed_round
  {
    if(Object.assign(dest, source) instanceof Error && (source.message || source.name) && ! source.stack)
      dest.stack = `${dest.name}: ${dest.message}\n    from NJSON`;

    return dest;
  }

error =
  err:("Error" / "EvalError" / "RangeError" / "ReferenceError" / "SyntaxError" / "TypeError" / "URIError") wss
  open_round message:value closed_round
  {
    const constructor = errors[err as Errors];
    const props = { configurable: true, value: undefined, writable: true };
    const val = new constructor(message);

    return Object.defineProperties(val, { cause: props, stack: { ...props, value: `${err}: ${message}\n    from NJSON` } });
  }

function = open_round parameters "=>" wss body closed_round arguments
  {
    const { value } = options!;

    if(value) {
      Object.assign(options!, { body: true, running: true, offset: value[1] });

      return peg$parse(value[0], options);
    }

    Object.assign(options!, { body: true, running: true, startRule: "statement" });

    for(const statement of options!.statements) {
      options!.offset = statement[1];

      const ret = peg$parse(statement[0], options);

      if(Array.isArray(ret)) return ret[0];
    }
  }

identifier = identifier:($[A-Z]+) ! [a-z] wss
  {
    const { offset, running, vars } = options!;

    if(running && ! (identifier in vars)) throw peg$buildSimpleError(`Undeclared variable ${identifier}.`, addLocations(offset, location()));

    return identifier;
  }

parameters = open_round params:(head:identifier tail:(comma @identifier)* { return [head, ...tail]; }) closed_round
  {
    const vars: any = {};

    Object.assign(options!, { body: true, params, types: {}, vars });
    for(const param of params as string[]) vars[param] = undefined;

    return null;
  }

body_value = value { Object.assign(options!, { body: false, value: [text(), location()] }); }

body =
  (open_brace statements:(head:statement tail:(";" wss @statement)* { return [head, ...tail]; }) closed_brace { Object.assign(options!, { body: false, statements }); }) /
  (open_round @body_value closed_round) / body_value

statement = chain / return

method =
  dot
  @(
    ( method:("add"  { return { location: location(), name: "add"  }; }) wss open_round value:value { return { ...method, value }; } ) /
    ( method:("push" { return { location: location(), name: "push" }; }) wss open_round args:(head:value tail:(comma @value)* comma? { return [head, ...tail]; }) { return { ...method, args }; } ) /
    ( method:("set"  { return { location: location(), name: "set"  }; }) wss open_round key:value comma value:value { return { ...method, key, value }; } )
  )
  closed_round

chain = identifier:identifier methods:(@method)*
  {
    const { body, offset, running, types, vars } = options!;
    let first = true;

    if(! body) throw peg$buildSimpleError("Unexpected identifier in this context.", location());
    if(! running) return [text(), location()];

    for(const method of methods) {
      const { args, key, location, name, value } = method;
      const type = types[identifier];

      if(name === "add") {
        if(type !== "Set") throw peg$buildSimpleError(`Can't call method "add" on ${first ? type : "Number"}.`, addLocations(offset, location));

        vars[identifier].add(value);
      } else if(name === "set") {
        if(type !== "Map") throw peg$buildSimpleError(`Can't call method "set" on ${first ? type : "Number"}.`, addLocations(offset, location));

        vars[identifier].set(key, value);
      } else {
        if(type !== "Array" || ! first) throw peg$buildSimpleError(`Can't call method "push" on ${first ? type : "Number"}.`, addLocations(offset, location));

        first = false;
        vars[identifier].push(...args);
      }
    }

    return first ? vars[identifier] : vars[identifier].length;
  }

return = "return" ws wss value:value { return options!.running ? [value] : [text(), location()]; }

arguments = open_round args:(head:value tail:(comma @value)* { return [head, ...tail]; }) closed_round
  {
    const { params, types, vars } = options!;

    if(params.length !== args.length) throw peg$buildSimpleError(`Expected ${params.length} arguments but ${args.length} found.`, location());

    for(let i = 0; i < args.length; ++i) {
      types[params[i]] = args[i].constructor.name;
      vars[params[i]] = args[i];
    }
  }
