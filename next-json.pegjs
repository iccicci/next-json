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

// ----- 2. JSON Grammar -----

NJSON_text = ws @value ws

begin_array     = ws "[" ws
begin_object    = ws "{" ws
end_array       = ws "]" ws
end_object      = ws "}" ws
name_separator  = ws ":" ws
value_separator = ws "," ws

ws "whitespace" = ([ \t\n\r] / "//" (![\n] .)* / "/*" (!"*/" .)* "*/")*

// ----- 3. Values -----

value = false / null / true / object / array / bigint / number / string / undefined / date

false     = "false"     { return false;     }
null      = "null"      { return null;      }
true      = "true"      { return true;      }
undefined = "undefined" { return undefined; }

// ----- 4. Objects -----

object
  = begin_object entries:( head:entry tail:(value_separator @entry)* { return Object.fromEntries([head, ...tail]); } )? end_object
    { return entries !== null ? entries: {}; }

entry = name:string name_separator value:value { return [name, value]; }

// ----- 5. Arrays -----

array
  = begin_array values:( head:value tail:(value_separator @value)* { return [head, ...tail]; } )? end_array
    { return values !== null ? values : []; }

// ----- 6. Numbers -----

bigint "bigint" = minus? int "n" { return BigInt(text().slice(0, -1)); }
number "number" = minus? int frac? exp? { return parseFloat(text()); }
decimal_point   = "."
digit1_9        = [1-9]
e               = [eE]
exp             = e (minus / plus)? DIGIT+
frac            = decimal_point DIGIT+
int             = zero / (digit1_9 DIGIT*)
minus           = "-"
plus            = "+"
zero            = "0"

// ----- 7. Strings -----

string "string" = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) { return String.fromCharCode(parseInt(digits, 16)); }
    )
    { return sequence; }

escape = "\\"

quotation_mark = '"'

unescaped = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i

// ----- 8. Dates -----

date = "Date" ws "(" ws time:(number / string) ws ")" {
    const date = new Date(time as string);

    if(isNaN(date.getTime())) throw peg$buildSimpleError("Invalid date.", location());

    return date;
  }
