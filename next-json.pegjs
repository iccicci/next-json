// NJSON Next-JSON Grammar
// ============
//
// Based on https://github.com/peggyjs/peggy/blob/main/examples/json.pegjs

// JSON Grammar
// ============
//
// Based on the grammar from RFC 7159 [1].
//
// Note that JSON is also specified in ECMA-262 [2], ECMA-404 [3], and on the
// JSON website [4] (somewhat informally). The RFC seems the most authoritative
// source, which is confirmed e.g. by [5].
//
// [1] http://tools.ietf.org/html/rfc7159
// [2] http://www.ecma-international.org/publications/standards/Ecma-262.htm
// [3] http://www.ecma-international.org/publications/standards/Ecma-404.htm
// [4] http://json.org/
// [5] https://www.tbray.org/ongoing/When/201x/2014/03/05/RFC7159-JSON

// ----- 2. NJSON Grammar -----

NJSON = wss @(value / function)

ws  "white space"  = [ \t\n\r] / "//" (![\n] .)* / "/*" (!"*/" .)* "*/"
wss "white spaces" = ws*
colon              = ":" wss
comma              = "," wss
dot                = "." wss
equal              = "=" wss
semicolon          = ";" wss
open_round         = "(" wss
closed_round       = ")" wss
open_square        = "[" wss
closed_square      = "]" wss
open_brace         = "{" wss
closed_brace       = "}" wss

// ----- 3. Values -----

value =
  (@(array / constructor / false / null / number / object / string / true / undefined) wss) /
  identifier:identifier
  {
    if(! options!.body) throw peg$buildSimpleError("Unexpected identifier in this context.", location());

    return options!.running ? options!.vars[identifier] : identifier;
  }

false     = "false"     { return false;     }
null      = "null"      { return null;      }
true      = "true"      { return true;      }
undefined = "undefined" { return undefined; }

// ----- 4. Objects -----

object = open_brace entries:(head:entry tail:(comma @entry)* { return Object.fromEntries([head, ...tail]); })? closed_brace { return entries !== null ? entries : {}; }
entry  = name:string colon value:value { return [name, value]; }

// ----- 5. Arrays -----

array = open_square values:(head:value tail:(comma @value)* { return [head, ...tail]; })? closed_square { return values !== null ? values : []; }

// ----- 6. Numbers -----
// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).

number "number" = ("NaN" { return NaN; } / "-"? ("Infinity" / integer ("n" / frac? exp?))) wss
  {
    const txt = text();

    if(txt === "-Infinity") return -Infinity;
    if(txt === "-0") return -0;
    if(txt === "Infinity") return Infinity;

    return txt.slice(-1) === "n" ? BigInt(txt.slice(0, -1)) : parseFloat(txt);
  }

exp     = [eE] ("-" / "+")? decimal+
frac    = "." decimal+
integer = "0" / ([1-9] decimal*)
decimal = [0-9]

// ----- 7. Strings -----

string "string" = '"' chars:char* escaped_new_line '"' wss { return chars.join(""); }

char = escaped_new_line @([^\0-\x1F"\\] / "\\" @(
  "b" { return "\b"; } /
  "f" { return "\f"; } /
  "n" { return "\n"; } /
  "r" { return "\r"; } /
  "t" { return "\t"; } /
  "u" digits:$(hexadecimal hexadecimal hexadecimal hexadecimal) { return String.fromCharCode(parseInt(digits, 16)); } /
  [^\0-\x1F]
))

escaped_new_line = ("\\\r\n" / "\\\r" / "\\\n")*

hexadecimal = digit:.
  {
    if(digit.match(/[0-9a-f]/i)) return digit;

    throw peg$buildSimpleError("Invalid Unicode escape sequence.", location());
  }

// ----- 8. Natives -----

constructor = "new" ws wss @(date / error / int8array / map / regexp / set / uint8array / uint8clampedarray / url)

// ----- 9. Dates -----

date = "Date" wss open_round time:(value:(number / string) { return { location: location(), value }; }) closed_round
  {
    const { value } = time as { value: number | string };

    if(typeof value === "number" && isNaN(value)) return new Date(NaN);

    const date = new Date(value);

    if(isNaN(date.getTime())) throw peg$buildSimpleError("Invalid date.", time.location);

    return date;
  }

// ----- 10. RegExps -----

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

// ----- 10. URLs -----

url = "URL" wss open_round url:(value:string { return { location: location(), value }; }) closed_round
  {
    try {
      return new URL(url.value);
    } catch(e: any) {
      const { message } = e;

      throw peg$buildSimpleError(message + ".", url.location);
    }
  }

// ----- 11. Sets -----

set = "Set" wss open_round elements:array? closed_round { return elements ? new Set(elements) : new Set(); }

// ----- 12. Maps -----

map = "Map" wss open_round elements:array_map_entry? closed_round { return elements ? new Map(elements) : new Map(); }

map_entry       = open_square key:value comma value:value closed_square { return [key, value]; }
array_map_entry = open_square values:(head:map_entry tail:(comma @map_entry)* { return [head, ...tail]; })? closed_square { return values !== null ? values : []; }

// ----- 13. TypedArrays -----

int8array         = "Int8Array"         wss open_round elements:array_small_number? closed_round { return elements ? new Int8Array(elements)         : new Int8Array();         }
uint8array        = "Uint8Array"        wss open_round elements:array_small_number? closed_round { return elements ? new Uint8Array(elements)        : new Uint8Array();        }
uint8clampedarray = "Uint8ClampedArray" wss open_round elements:array_small_number? closed_round { return elements ? new Uint8ClampedArray(elements) : new Uint8ClampedArray(); }

array_small_number = open_square values:(head:small_number tail:(comma @small_number)* { return [head, ...tail]; })? closed_square { return values !== null ? values : []; }

small_number = value:number
  {
    if(typeof value === "bigint") throw peg$buildSimpleError("BigInt is not allowed for TypedArray.", location());

    return value;
  }

// ----- 14. Errors -----

error =
  err:("Error" / "EvalError" / "RangeError" / "ReferenceError" / "SyntaxError" / "TypeError" / "URIError") wss
  open_round message:string closed_round
  {
    const constructor = errors[err as Errors];
    const props = { configurable: true, value: undefined, writable: true };
    const val = new constructor(message);

    return Object.defineProperties(val, { "cause": props, "stack": props });
  }
  /* Valid from Node.js v16: need to be refactored
  open_round message:string cause:(comma open_brace '"cause"' wss colon @value closed_brace)? closed_round
  {
    const constructor = errors[err as Errors];
    const val = cause ? new constructor(message, { cause }) : new constructor(message);

    return Object.defineProperty(val, "stack", { configurable: true, value: undefined, writable: true });
  }
  */

// ----- 15. Repeated references -----

function =
  open_round parameters "=>" wss body closed_round arguments
  {
    Object.assign(options!, { body: true, running: true, startRule: "statement" });

    for(const statement of options!.statements) {
      options!.offset = statement[1];

      const ret = peg$parse(statement[0], options);

      if(ret instanceof Array) return ret[0];
    }
  }

identifier =
  identifier:($[A-Z]+) wss
  {
    const { offset, running, vars } = options!;

    if(! running) return identifier;
    if(! (identifier in vars)) throw peg$buildSimpleError(`Undeclared variable ${identifier}.`, addLocations(offset, location()));

    return identifier;
  }

parameters =
  open_round
  params:(head:identifier tail:(comma @identifier)* { return [head, ...tail]; })
  closed_round
  {
    const vars: any = {};

    Object.assign(options!, { body: true, params, types: {}, vars });
    for(const param of params as string[]) vars[param] = undefined;

    return null;
  }

body =
  open_brace
  statements:(head:statement tail:(semicolon @statement)* { return [head, ...tail]; })
  closed_brace
  {
    Object.assign(options!, { body: false, statements });
  }

statement = assignment / method / return

assignment =
  identifier:identifier
  open_square
  index:(index:(int:integer { return [int, false]; } / str:string { return [str, true]; }) { return [...index, location()]; })
  closed_square
  equal
  value:value
  {
    const { offset, running, types, vars } = options!;

    if(! running) return [text(), location()];

    const type = types[identifier];
    let [idx, str, where] = index;

    if(type === "Array") {
      if(str) throw peg$buildSimpleError(`Expected integer but ${JSON.stringify(idx)} found.`, addLocations(offset, where));

      idx = parseInt(idx, 10);
    } else if(type === "Error" || type === "Object") {
      if(! str) throw peg$buildSimpleError(`Expected string but "${idx}" found.`, addLocations(offset, where));
    } else throw peg$buildSimpleError(`Can't assign property to ${type}.`, addLocations(offset, location()));

    vars[identifier][idx] = value;
  }

method =
  identifier:identifier
  dot
  method:(
    (
      "add" wss
      open_round
      value:value
      {
        return { name: "add", value };
      }
    ) /
    (
      "set" wss
      open_round
      key:value
      comma
      value:value
      {
        return { key, name: "set", value };
      }
    )
  )
  closed_round
  {
    const { offset, running, types, vars } = options!;

    if(! running) return [text(), location()];

    const { key, name, value } = method;
    const type = types[identifier];

    if(name === "add") {
      if(type !== "Set") throw peg$buildSimpleError(`Can't call method "add" on ${type}.`, addLocations(offset, location()));

      vars[identifier].add(value);
    } else {
      if(type !== "Map") throw peg$buildSimpleError(`Can't call method "set" on ${type}.`, addLocations(offset, location()));

      vars[identifier].set(key, value);
    }
  }

return =
  "return" wss value:value
  {
    return options!.running ? [value] : [text(), location()];
  }

arguments =
  open_round
  args:(head:value tail:(comma @value)* { return [head, ...tail]; })
  closed_round
  {
    const { params, types, vars } = options!;

    if(params.length !== args.length) throw peg$buildSimpleError(`Expected ${params.length} arguments but ${args.length} found.`, location());

    for(let i = 0; i < args.length; ++i) {
      types[params[i]] = args[i].constructor.name;
      vars[params[i]] = args[i];
    }
  }
