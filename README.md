# NJSON - next-json

Next JavaScript Object Notation

[![Build Status][travis-badge]][travis-url]
[![NPM version][npm-badge]][npm-url]
[![Types][types-badge]][npm-url]
[![Dependents][deps-badge]][deps-url]

[![Code Climate][code-badge]][code-url]
[![Test Coverage][cover-badge]][code-url]
[![NPM downloads][npm-downloads-badge]][npm-url]

[![Stars][stars-badge]][stars-url]
[![Donate][donate-badge-ada]][donate-url-ada]
[![Donate][donate-badge-btc]][donate-url-btc]
[![Donate][donate-badge-eth]][donate-url-eth]

[code-badge]: https://codeclimate.com/github/iccicci/next-json/badges/gpa.svg
[code-url]: https://codeclimate.com/github/iccicci/next-json
[cover-badge]: https://codeclimate.com/github/iccicci/next-json/badges/coverage.svg
[deps-badge]: https://img.shields.io/librariesio/dependents/npm/next-json?logo=npm
[deps-url]: https://www.npmjs.com/package/next-json?activeTab=dependents
[donate-badge-ada]: https://img.shields.io/static/v1?label=donate&message=cardano&color=blue&logo=cardano
[donate-badge-btc]: https://img.shields.io/static/v1?label=donate&message=bitcoin&color=blue&logo=bitcoin
[donate-badge-eth]: https://img.shields.io/static/v1?label=donate&message=ethereum&color=blue&logo=ethereum
[donate-url-ada]: https://cardanoscan.io/address/DdzFFzCqrhsxfKAujiyG5cv3Bz7wt5uahr9k3hEa8M6LSYQMu9bqc25mG72CBZS3vJEWtWj9PKDUVtfBFcq5hAtDYsZxfG55sCcBeHM9
[donate-url-btc]: https://www.blockchain.com/explorer/addresses/btc/3BqXRqgCU2CWEoZUgrjU3b6VTR26Hee5gq
[donate-url-eth]: https://www.blockchain.com/explorer/addresses/eth/0x8039fD67b895fAA1F3e0cF539b8F0290EDe1C042
[github-url]: https://github.com/iccicci/next-json
[npm-downloads-badge]: https://img.shields.io/npm/dw/next-json?logo=npm
[npm-badge]: https://img.shields.io/npm/v/next-json?color=green&logo=npm
[npm-url]: https://www.npmjs.com/package/next-json
[stars-badge]: https://img.shields.io/github/stars/iccicci/next-json?logo=github&style=flat&color=green
[stars-url]: https://github.com/iccicci/next-json/stargazers
[travis-badge]: https://img.shields.io/travis/com/iccicci/next-json?logo=travis
[travis-url]: https://app.travis-ci.com/github/iccicci/next-json
[types-badge]: https://img.shields.io/static/v1?label=types&message=included&color=green&logo=typescript

## Why this package?

Because JSON is awesome, but...

JSON is awesome mainly for two reasons:

1. it offers an easy way to serialize and deserialize complex data;
2. a valid JSON encoded string can be pasted in a JavaScript source file, a really awesome feature while developing / debugging.

... but it has some limitations:

- doesn't support `undefined` values,
- doesn't support `BigInt` numbers,
- doesn't support many other features...

This package is intended to offer something as great as JSON... trying to add something more.

## NJSON Features

- &#9745; extends JSON
- &#9745; supports C style comments
- &#9745; supports escaped new line in strings
- &#9745; supports trailing commas
- &#9745; supports circular and repeated references
- &#9745; supports `undefined`
- &#9745; supports `-0`, `NaN` and `Infinity`
- &#9745; supports `BigInt`
- &#9745; supports `Date`
- &#9745; supports `Error` (with [exception](#the-error-exception))
- &#9745; supports `Map`
- &#9745; supports `RegExp`
- &#9745; supports `Set`
- &#9745; supports `TypedArray`s (but `Float16Array`)
- &#9745; supports `URL`

## NJSON extends JSON

This doesn't mean it's 100% compliant: due its higher number of supported features the result string of the
serialization through `NJSON.stringify` may differs from the result of the serialization through `JSON.stringify`.

On the other hand, the result of the deserialization of a _valid JSON encoded string_ through `NJSON.parse` will
produce a value _deep equal_ to the value produced by `JSON.parse` and the `reviver` function will be called the same
amount of times, with the same parameters and in the same order.

**Note:** the `reviver` function still not implements the newly added `context` argument.

Taken the result of a `JSON.parse` call (i.e. a value which contains only _valid JSON values_), if serialized through
`JSON.stringify` or `NJSON.stringify` produces two equal strings and the `replacer` function will be called the same
amount of times, with the same parameters and in the same order.

## NJSON parser

**NJSON** offers its own parser which means it **doesn't use** `eval` with its related security hole.

Even if the **NJSON** serialized string is _JavaScript compliant_, `NJSON.parse` is not able to parse any JavaScript
code, but only the subset produced by `NJSON.stringify` (otherwise it would have been another `eval` implementation).

## Not supported by design

**NJSON** do not supports some `Object`s by design; when one of them is encountered during the serialization process
`NJSON` tries to act as `JSON` does. Nonetheless they take part in the _repeated references algorithm_ anyway. Follow
the details.

### ArrayBuffer

`ArrayBuffer`s can't be manipulated by JavaScript design: they are serialized as empty objects as `JSON` does.

### Function

**NJSON** is designed to _serialize_ / _deserialize_ complex data to be shared between different systems, possibly
written with other languages than JavaScript (once implementations in other languages will be written). Even if
JavaScript can see a function as a piece of data, it is actually code, not data. More than this, for other languages,
may be a complex problem to execute JavaScript functions.

Last but not least, allowing the deserialization of a function would open once again the security hole implied by the
use of `eval`, and one of the reasons why **NJSON** was born, is exactly to avoid that security hole.

### Symbol

A `Symbol` is something strictly bound to the JavaScript execution environment which instantiates it: sharing it
between distinct systems is something almost meaningless.

### TypedArray

**Note:** except for `Int8Array`, `Uint8Array` and `Uint8ClampedArray`, `TypedArray`s are platform dependant: they are
supported (but `Float16Array` as it is not supported by **Node.js**), but trying to transfer one of them between
different architectures may be source of unexpected problems.

## The `Error` exception

`Error`'s are special objects. By specifications the properties `cause`, `message`, `name` and `stack` are not
enumerable, **NJSON** serializes them as any other property. This, plus the nature of the `stack` property, originates
the `Error` exception to the rule that an _NJSON encoded string_ produces exactly the same value if parsed or
evaluated.

- `cause`:

  - through `NJSON.parse` the result is **a not enumerable** property;
  - through `eval` the result may be **an enumerable** or **a not enumerable** property depending on the running
    JavaScript engine;

- `stack`:

  - if absent:

    - through `NJSON.parse` the result is **a not enumerable** property with value a _pseudo-stack_;
    - through `eval` the result is the standard `stack` property for the running JavaScript engine;

  - if present:

    - through `NJSON.parse` the result is **a not enumerable** property;
    - through `eval` the result may be **an enumerable** or **a not enumerable** property depending on the running
      JavaScript engine;

The only option in my mind to avoid this exception is the use of `Object.defineProperties`, but it would increase both
the complexity of the parser and the size of the produced serialized string. Maybe in the future... configurable
through an option... if this can't be really tolerated.

# Installation

With [npm](https://www.npmjs.com/package/next-json):

```sh
npm install --save next-json
```

# Usage

### JavaScript

```javascript
import { NJSON } from "next-json";

const serialized = NJSON.stringify({ some: "value" });
const deserialized = NJSON.parse(serialized);
```

### TypeScript

```typescript
import { NJSON, NjsonParseOptions, NjsonStringifyOptions } from "next-json";

const serialized = NJSON.stringify({ some: "value" });
const deserialized = NJSON.parse<{ some: string }>(serialized);
```

# Example

```javascript
const obj = { test: Infinity };
const set = new Set();
const arr = [NaN, obj, set];

arr.push(arr);
arr.push(obj);
obj.arr = arr;
set.add(obj);
set.add(arr);

console.log(NJSON.stringify(arr));
// ((A,B)=>{B.push(Object.assign(A,{"arr":B}),new Set([A,B]),B,A);return B})({"test":Infinity},[NaN])
```

# Polyfill

## Server side

```javascript
import express from "express";
import { expressNJSON } from "next-json";

const app = express();

app.use(expressNJSON()); // install the polyfill
app.all("/mirror", (req, res) => res.njson(req.body)); // there is an 'n' more than usual
app.listen(3000);
```

## Client side

```javascript
import { NJSON, fetchNJSON } from "next-json";

fetchNJSON(); // install the polyfill

const payload = { infinity: Infinity };
payload.circular = payload;

const response = await fetch("http://localhost:3000/mirror", {
  body: NJSON.stringify(payload), // there is an 'N' more than usual
  headers: { "Content-Type": "application/njson" }, // there is an 'n' more than usual
  method: "POST"
});
const body = await response.njson(); // there is an 'n' more than usual
```

Here `payload` deep equals `payload.circular`, which deep equals `body`, which deep equals `body.circular`, which deep
equals `req.body` in server side, which deep equals `req.body.circular` in server side! &#127881;

# MIME type

The MIME type for NJSON format is: `application/njson` .

# API

## NJSON.parse(text[, reviver])

Just for compatibility with `JSON.parse`. Alias for:

```typescript
NJSON.parse(text, { reviver });
```

## NJSON.parse(text[, options])

Converts a Next JavaScript Object Notation (NJSON) string into an object.

- `text`: [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) The text
  to deserialize.
- `options`: [&lt;NjsonParseOptions>](#interface-njsonparseoptions) Deserialization options.
- Returns: [&lt;unknown>](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) The _value_ result of
  the deserialization of the **NJSON** encoded `text`.

## NJSON.stringify(value[, replacer[, space]])

Just for compatibility with `JSON.stringify`. Alias for:

```typescript
NJSON.stringify(value, { replacer, space });
```

## NJSON.stringify(value[, options])

Converts a JavaScript value to a Next JavaScript Object Notation (NJSON) string.

- `value`: [&lt;unknown>](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) The value to
  serialize.
- `options`: [&lt;NjsonStringifyOptions>](#interface-njsonstringifyoptions) Serialization options.
- Returns: [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) The
  **NJSON** encoded serialized form of `value`.

## interface NjsonParseOptions

- [`numberKey`](#njsonparseoptionsnumberkey):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Alters the type of the `key` argument for `reviver`. **Default:** `false`.
- [`reviver`](#njsonparseoptionsreviver):
  [&lt;Function>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) Alters the
  behavior of the deserialization process. **Default:** `null`.

### NjsonParseOptions.numberKey

If `true`, the `reviver` function, for `Array` elements, will be called with the `key` argument in a `Number` form.

### NjsonParseOptions.reviver

As the
[`reviver`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#parameters)
parameter of `JSON.parse`. See also [replacer / reviver](#replacer--reviver) for NJSON specific details.

**Note:** the `reviver` function still not implements the newly added `context` argument.

## interface NjsonStringifyOptions

- [`date`](#njsonstringifyoptionsdate):
  [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)
  Specifies `Date`s conversion method. **Default:** `"time"`.
- [`numberKey`](#njsonstringifyoptionsnumberkey):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Alters the type of the `key` argument for `replacer`. **Default:** `false`.
- [`omitStack`](#njsonstringifyoptionsomitstack):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Specifies if to stringify `stack` for `Error`s. **Default:** `false`.
- [`replacer`](#njsonstringifyoptionsreplacer):
  [&lt;Function>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
  [&lt;Array>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) | `null` Alters
  the behavior of the serialization process. **Default:** `null`.
- [`sortKeys`](#njsonstringifyoptionssortkeys):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Specifies whether to sort `Object` keys. **Default:** `false`.
- [`space`](#njsonstringifyoptionsspace):
  [&lt;number>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) |
  [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) | `null` Specifies
  the indentation. **Default:** `null`.
- [`stringLength`](#njsonstringifyoptionsstringlength):
  [&lt;number>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) | `null` Makes
  `String`s to be treated as references. **Default:** `null`.
- [`undef`](#njsonstringifyoptionsundef):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Specifies the `undefined` behavior. **Default:** `true`.

### NjsonStringifyOptions.date

Specifies the method of `Date` objects used to serialize them. Follows the list of the allowed values and the relative
method used.

- `"iso"`: `Date.toISOString()`
- `"string"`: `Date.toString()`
- `"time"`: `Date.getTime()` - the default
- `"utc"`: `Date.toUTCString()`

### NjsonStringifyOptions.numberKey

If `true`, the `replacer` function, for `Array` elements, will be called with the `key` argument in a `Number` form.

### NjsonStringifyOptions.omitStack

For default `NJSON.stringify` serializes the `stack` property for `Error`s. If set to `true`, the property is omitted
from the serialized representation.

### NjsonStringifyOptions.replacer

As the
[`replacer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters)
parameter of `JSON.serialize`. See also [replacer / reviver](#replacer--reviver) for NJSON specific details.

### NjsonStringifyOptions.sortKeys

For default **NJSON** stringifies (and replaces as well) `Object` keys in the order they appear in the `Object` itself.
If set to `true`, `Object` keys are sorted alphabetically before both the processes. This can be useful to compare two
references: using this option, the stringified representation of two deep equal references are two equal strings.

### NjsonStringifyOptions.space

As the
[`space`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters)
parameter of `JSON.serialize`.

### NjsonStringifyOptions.stringLength

If specified, `String`s which `length` is greater or equal to the specified value take part in the _repeated references
algorithm_.

### NjsonStringifyOptions.undef

For default `NJSON.stringify` serializes `undefined` values as well. If set to `false`, `undefined` values are
treated as `JSON.stringify` does.

## expressNJSON([options])

An Express middleware which works as NJSON body parser and installs the
[`Express.Response.njson`](#expressresponsenjsonbody-options) method.

- `options`: [&lt;NjsonStringifyOptions>](#interface-expressnjsonoptions) NJSON Express middleware options.
- Returns: [Express middleware](https://expressjs.com/en/guide/using-middleware.html) The NJSON Express middleware.

## interface ExpressNjsonOptions

- [`parse`](#expressnjsonoptionsparse): [&lt;NjsonParseOptions>](#interface-njsonparseoptions) The `options` passed to
  [`NJSON.parse`](#njsonparsetext-options) by the middleware to parse the request body.
- [`stringify`](#expressnjsonoptionsstringify): [&lt;NjsonStringifyOptions>](#interface-njsonstringifyoptions) The
  default `options` passed to [`NJSON.stringify`](#njsonstringifyvalue-options) by
  [`Express.Response.njson`](#expressresponsenjsonbody-options) to serialize the response body.

### ExpressNjsonOptions.parse

The `options` passed to [`NJSON.parse`](#njsonparsetext-options) by the middleware to parse the request body.

### ExpressNjsonOptions.stringify

The default `options` passed to [`NJSON.stringify`](#njsonstringifyvalue-options) by
[`Express.Response.njson`](#expressresponsenjsonbody-options) to serialize the response.

## Express.Response.njson(body[, options])

Encodes the body in NJSON format and sends it; sets the proper `Content-Type` header as well. Installed by
[`expressNJSON`](#expressnjsonoptions).

- `body`: [&lt;unknown>](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) The body to be sent
  serialized.
- `options`: [&lt;NjsonStringifyOptions>](#interface-njsonstringifyoptions) The `options` passed to
  [`NJSON.stringify`](#njsonstringifyvalue-options) to serialize the response body; overrides the default
  `options.stringify` passed to [`expressNJSON`](#expressnjsonoptions).

## fetchNJSON([options])

Installs the [`Response.njson`](#responsenjsonoptions) method.

- [`options`](#expressnjsonoptionsparse): [&lt;NjsonParseOptions>](#interface-njsonparseoptions) The default `options`
  passed to [`NJSON.parse`](#njsonparsetext-options) by [`Response.njson`](#responsenjsonoptions) to parse the response
  body.

## Response.njson([options])

Parses the response body with [`NJSON.parse`](#njsonparsetext-options). Installed by
[`fetchNJSON`](#fetchnjsonoptions).

- `options`: [&lt;NjsonParseOptions>](#interface-njsonparseoptions) The `options` passed to
  [`NJSON.parse`](#njsonparsetext-options) to parse the response body; overrides the default `options` passed to
  [`fetchNJSON`](#fetchnjsonoptions).
- Returns: [&lt;unknown>](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) The body parsed with
  [`NJSON.parse`](#njsonparsetext-options).

# replacer / reviver

Even if `Date`, `RegExp`, `TypedArray`s and `URL` are `Object`s, they are treated as native values i.e. `replacer` and
`reviver` will be never called with one of them as `this` context.

### Array

For `Array`s the `key` argument is a positive integer, but in a `String` form for `JSON` compatibility. This can be
altered (i.e. in a `Number` form) through the `numberKey` option.

### Map

`Map`'s keys can be `Function`s and `Symbol`s; for `Map`s the `key` argument is a positive integer in a `Number` form
and the `value` argument is the entry in the form `[mapKey, mapValue]`. This gives a way to _replace_/_revive_ keys
which can't be serialized. If `replacer` or `reviver` do not return a two elements array, the value is omitted.

### Set

For `Set`s the `key` argument is a positive integer and it is passed in a `Number` form.

### TypedArray

Unlike `JSON`, `NJSON` does not call `replacer` and `reviver` for each element.

# circular / repeated references

Regardless of whether they are omitted, serialized as native values or not, every `Object`s (but `null`), `Function`s
and `Symbol`s take part in the _repeated references algorithm_; long `String`s can take part as well (refer to
[`NjsonStringifyOptions.stringLength`](#njsonstringifyoptionsstringlength) for details).<br />
When a repeated reference is encountered, `replacer` and `reviver` are called against the reference, but it is not
called recursively against its properties. If a property of a repeated reference is changed, the same change has effect
in all other occurrences of the same reference.<br />
Circular references are simply special cases of repeated references.

# Compatibility

Requires **Node.js v14**.

**Exception:** [`fetchNJSON`](#fetchnjsonoptions) requires **Node.js v18**.

The package is tested under [all Node.js versions](https://app.travis-ci.com/github/iccicci/next-json)
currently supported accordingly to [Node.js Release](https://github.com/nodejs/Release#readme).

# TypeScript

**TypeScript** types are distributed with the package itself.

# License

[MIT License](https://github.com/iccicci/next-json/blob/master/LICENSE)

# Bugs

Do not hesitate to report any bug or inconsistency [@github](https://github.com/iccicci/next-json/issues).

# Donating

If you find useful this package, please consider the opportunity to donate on one of following cryptos:

<!-- /* cSpell:disable */ -->

ADA: **DdzFFzCqrhsxfKAujiyG5cv3Bz7wt5uahr9k3hEa8M6LSYQMu9bqc25mG72CBZS3vJEWtWj9PKDUVtfBFcq5hAtDYsZxfG55sCcBeHM9**

BTC: **3BqXRqgCU2CWEoZUgrjU3b6VTR26Hee5gq**

ETH: **0x8039fD67b895fAA1F3e0cF539b8F0290EDe1C042**

<!-- /* cSpell:enable */ -->

# See also

Other projects which aim to solve similar problems:

<!-- /* cSpell:disable */ -->

- [arson](https://github.com/benjamn/arson) by Ben Newman
- [devalue](https://github.com/Rich-Harris/devalue) by Rich Harris
- [jsesc](https://github.com/mathiasbynens/jsesc) by Mathias Bynens
- [lave](https://github.com/jed/lave) by Jed Schmidt
- [oson](https://github.com/KnorpelSenf/oson) by Steffen Trog
- [serialize-javascript](https://github.com/yahoo/serialize-javascript) by Eric Ferraiuolo
- [superjson](https://github.com/blitz-js/superjson) by Blitz
- [tosource](https://github.com/marcello3d/node-tosource) by Marcello Bast&eacute;a-Forte
