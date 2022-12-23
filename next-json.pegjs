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

NJSON_text = wss @value wss

comma = wss "," wss

ws  "white space"  = [ \t\n\r] / "//" (![\n] .)* / "/*" (!"*/" .)* "*/"
wss "white spaces" = ws*

// ----- 3. Values -----

value = array / constructor / false / null / number / object / string / true / undefined

false     = "false"     { return false;     }
null      = "null"      { return null;      }
true      = "true"      { return true;      }
undefined = "undefined" { return undefined; }

// ----- 4. Objects -----

object = "{" wss entries:(head:entry tail:(comma @entry)* { return Object.fromEntries([head, ...tail]); })? wss "}" { return entries !== null ? entries : {}; }
entry  = name:string wss ":" wss value:value { return [name, value]; }

// ----- 5. Arrays -----

array = "[" wss values:(head:value tail:(comma @value)* { return [head, ...tail]; })? wss "]" { return values !== null ? values : []; }

// ----- 6. Numbers -----
// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).

number "number" = "NaN" { return NaN; } / "-"? ("Infinity" / integer ("n" / frac? exp?)) {
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

string "string" = '"' chars:char* '"' { return chars.join(""); }

char = [^\0-\x1F"\\] / "\\" @(
  "b" { return "\b"; } /
  "f" { return "\f"; } /
  "n" { return "\n"; } /
  "r" { return "\r"; } /
  "t" { return "\t"; } /
  "u" digits:$(hexadecimal hexadecimal hexadecimal hexadecimal) { return String.fromCharCode(parseInt(digits, 16)); } /
  [^\0-\x1F]
)

hexadecimal = digit:. {
  if(digit.match(/[0-9a-f]/i)) return digit;

  throw peg$buildSimpleError("Invalid Unicode escape sequence.", location());
}

// ----- 8. Natives -----

constructor = "new" ws wss @(date / regexp)

// ----- 9. Dates -----

date = "Date" wss "(" wss time:(value:(number / string) { return { location: location(), value }; }) wss ")" {
  const { value } = time as { value: number | string };

  if(typeof value === "number" && isNaN(value)) return new Date(NaN);

  const date = new Date(value);

  if(isNaN(date.getTime())) throw peg$buildSimpleError("Invalid date.", time.location);

  return date;
}

// ----- 10. RegExps -----

regexp =
  "RegExp" wss "(" wss
  exp:(value:string { return { location: location(), value }; })
  flags:(comma @(value:string { return { location: location(), value }; }))?
  wss ")" {
    try {
      return flags ? new RegExp(exp.value, flags.value) : new RegExp(exp.value);
    }
    catch(e: any) {
      const { message } = e;

      throw peg$buildSimpleError(message + ".", message.match("Invalid flags") ? flags.location : exp.location);
    }
  }
