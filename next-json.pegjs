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

NJSON_text = wss @value

ws  "white space"  = [ \t\n\r] / "//" (![\n] .)* / "/*" (!"*/" .)* "*/"
wss "white spaces" = ws*
colon              = ":" wss
comma              = "," wss
open_round         = "(" wss
closed_round       = ")" wss
open_square        = "[" wss
closed_square      = "]" wss
open_brace         = "{" wss
closed_brace       = "}" wss

// ----- 3. Values -----

value = @(array / constructor / false / null / number / object / string / true / undefined) wss

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

number "number" = ("NaN" { return NaN; } / "-"? ("Infinity" / integer ("n" / frac? exp?))) wss {
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

hexadecimal = digit:. {
  if(digit.match(/[0-9a-f]/i)) return digit;

  throw peg$buildSimpleError("Invalid Unicode escape sequence.", location());
}

// ----- 8. Natives -----

constructor = "new" ws wss @(date / int8array / map / regexp / set / uint8array / uint8clampedarray / url)

// ----- 9. Dates -----

date = "Date" wss open_round time:(value:(number / string) { return { location: location(), value }; }) closed_round {
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
  closed_round {
    try {
      return flags ? new RegExp(exp.value, flags.value) : new RegExp(exp.value);
    }
    catch(e: any) {
      const { message } = e;

      throw peg$buildSimpleError(message + ".", message.match("Invalid flags") ? flags.location : exp.location);
    }
  }

// ----- 10. URLs -----

url = "URL" wss open_round url:(value:string { return { location: location(), value }; }) closed_round {
    try {
      return new URL(url.value);
    }
    catch(e: any) {
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

small_number = value:number {
  if(typeof value === "bigint") throw peg$buildSimpleError("BigInt is not allowed for TypedArray.", location());

  return value;
}
