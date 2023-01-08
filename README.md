# NJSON - next-json

Next JSON format

[![Build Status][travis-badge]][travis-url]
[![Code Climate][code-badge]][code-url]
[![Test Coverage][cover-badge]][code-url]

[![NPM version][npm-badge]][npm-url]
[![NPM downloads][npm-downloads-badge]][npm-url]
[![Stars][stars-badge]][github-url]

[![Types][types-badge]][npm-url]
[![Dependents][deps-badge]][npm-url]
[![Donate][donate-badge]][donate-url]

[code-badge]: https://codeclimate.com/github/iccicci/next-json/badges/gpa.svg
[code-url]: https://codeclimate.com/github/iccicci/next-json
[cover-badge]: https://codeclimate.com/github/iccicci/next-json/badges/coverage.svg
[deps-badge]: https://badgen.net/npm/dependents/next-json?icon=npm&cache=300
[donate-badge]: https://badgen.net/badge/donate/bitcoin?icon=bitcoin&cache=300
[donate-url]: https://blockchain.info/address/1Md9WFAHrXTb3yPBwQWmUfv2RmzrtbHioB
[github-url]: https://github.com/iccicci/next-json
[npm-downloads-badge]: https://badgen.net/npm/dw/next-json?icon=npm&cache=300
[npm-badge]: https://badgen.net/npm/v/next-json?color=green&icon=npm&cache=300
[npm-url]: https://www.npmjs.com/package/next-json
[stars-badge]: https://badgen.net/github/stars/iccicci/next-json?icon=github&cache=300
[travis-badge]: https://badgen.net/travis/iccicci/next-json?icon=travis&cache=300
[travis-url]: https://app.travis-ci.com/github/iccicci/next-json
[types-badge]: https://badgen.net/npm/types/next-json?color=green&icon=typescript&cache=300

## Why this package?

Because JSON is awesome, but...

JSON is awesome mainly for two reasons:

1. it offers an easy way to serialize and deserialize complex data;
2. a valid JSON encoded string can be pasted in a JavaScript source file, a really awesome feature while developing / debugging.

... but it has some limitations:

- do not supports `undefined` values,
- do not supports `BigInt` numbers,
- do not supports many other features...

This package is intended to offer something as great as JSON... trying to add something more.

## NJSON Features

- &#9745; extends JSON
- &#9745; supports C style comments
- &#9745; supports escaped new line in strings
- &#9745; supports `undefined`
- &#9745; supports `-0`, `NaN` and `Infinity`
- &#9745; supports `BigInt`
- &#9745; supports `Date`
- &#9745; supports `Int8Array`, `Uint8Array` and `Uint8ClampedArray`
- &#9745; supports `Map`
- &#9745; supports `RegExp`
- &#9745; supports `Set`
- &#9745; supports `URL`
- &#9745; supports `Error` with `Error.message`
- &#9744; supports `Error.cause`, `Error.name` and `Error.stack`
- &#9744; supports circular references

## NJSON extends JSON

This doesn't mean it's 100% compliant: due its higher number of supported features the result string of the
serialization through `NJSON.stringify` may differs from the result of the serialization through `JSON.stringify`.

On the other hand, the result of the deserialization of a _valid JSON encoded string_ through `NJSON.parse` will
produce a value _deep equal_ to the value produced by `JSON.parse` and the `reviver` function will be called the same
amount of times, with the same parameters and in the same order.

Taken the result of a `JSON.parse` call (i.e. a value which contains only _valid JSON values_), if serialized through
`JSON.stringify` or `NJSON.stringify` produces two equal strings and the `replacer` function will be called the same
amount of times, with the same parameters and in the same order.

## NJSON parser

**NJSON** offers its own parser which means it **doesn't use** `eval` with its related security hole.

Even if the **NJSON** serialized string is _JavaScript compliant_, `NJSON.parse` is not able to parse any JavaScript
code, but only the subset produced by `NJSON.stringify` (otherwise it would have been another `eval` implementation).

## Not supported by design

**NJSON** do not supports some `Object`s by design; when one of them is encountered during the serialization process
they will be simply omitted (as `JSON` does). Follow the reasons.

### ArrayBuffer

`ArrayBuffer`s can't be manipulated by JavaScript design: `Int8Array`, `Uint8Array` or `Uint8ClampedArray` can be used.

### Function

**NJSON** is designed to _serialize_ / _deserialize_ complex data to be shared between different systems, possibly
written with other languages than JavaScript (once implementations in other languages will be written). Even if
JavaScript can see a function as a piece of data, it is actually code, not data. More than this, for other languages,
may be a complex problem execute JavaScript functions.

Last but not least, allowing the deserialization of a function would open once again the security hole implied by the
use of `eval`, and one of the reasons why **NJSON** was born, is exactly to avoid that security hole.

### Symbol

A `Symbol` is something strictly bound to the JavaScript execution environment which instantiate it: sharing it between
distinct systems is something almost meaningless.

### TypedArray

Except for `Int8Array`, `Uint8Array` and `Uint8ClampedArray`, `TypedArray`s are platform dependant: trying to transfer
one of them between different architectures could result in unexpected problems.

# Installation

With [npm](https://www.npmjs.com/package/next-json):

```sh
npm install --save next-json
```

# Usage

### JavaScript

```javascript
import { NJSON, NjsonParseOptions, NjsonStringifyOptions } from "next-json";

const serialized = NJSON.stringify({ some: "value" });
const deserialized = NJSON.parse(serialized);
```

### TypeScript

```typescript
import { NJSON, NjsonParseOptions, NjsonStringifyOptions } from "next-json";

const serialized: string = NJSON.stringify({ some: "value" });
const deserialized: { some: string } = NJSON.parse<{ some: string }>(serialized);
```

# API

## NJSON.parse(text[, reviver])

Just for compatibility with `JSON.parse`. Alias for:

```typescript
NJSON.parse(text, { reviver });
```

## NJSON.parse(text[, options])

- `text` [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) The text to
  deserialize.
- `options` [&lt;NjsonParseOptions>](#interface-njsonparseoptions) Deserialization options.
- Returns: [&lt;unknown>](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) The _value_ result of
  the deserialization of the **NJSON** encoded `text`.

## NJSON.stringify(value[, replacer[, space]])

Just for compatibility with `JSON.stringify`. Alias for:

```typescript
NJSON.stringify(value, { replacer, space });
```

## NJSON.stringify(value[, options])

- `value` [&lt;unknown>](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) The value to serialize.
- `options` [&lt;NjsonStringifyOptions>](#interface-njsonstringifyoptions) Serialization options.
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

## interface NjsonStringifyOptions

- [`date`](#njsonstringifyoptionsdate):
  [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)
  Specifies `Date`s conversion method. **Default:** `"time"`.
- [`numberKey`](#njsonstringifyoptionsnumberkey):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Alters the type of the `key` argument for `replacer`. **Default:** `false`.
- [`replacer`](#njsonstringifyoptionsreplacer):
  [&lt;Function>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
  [&lt;Array>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) Alters the
  behavior of the serialization process. **Default:** `null`.
- [`space`](#njsonstringifyoptionsspace):
  [&lt;number>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) |
  [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)
  Specifies the indentation. **Default:** `null`.
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

### NjsonStringifyOptions.replacer

As the
[`replacer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters)
parameter of `JSON.serialize`. See also [replacer / reviver](#replacer--reviver) for NJSON specific details.

### NjsonStringifyOptions.space

As the
[`space`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters)
parameter of `JSON.serialize`.

### NjsonStringifyOptions.undef

For default `NJSON.stringify` serializes `undefined` values as well. If set to `false`, `undefined` values are
treated as `JSON.stringify` does.

# replacer / reviver

Even if `Date`, `Int8Array`, `RegExp`, `URL`, `Uint8Array` and `Uint8ClampedArray` are `Object`s, they are treated as
native values i.e. `replacer` and `reviver` will be never called with one of them as `this` context.<br />
For `Array`s the `key` argument is obviously a positive integer, but in a `String` form for `JSON` compatibility. This
can be altered (i.e. in a `Number`) form the `numberKey` option can be used.<br />
For `Set`s the `key` argument is obviously a positive integer as well, but it is only passed in a `Number` form.<br />
For `Map`s the `key` argument is once again a positive integer in a `Number` form and the `value` argument is the entry
in the form `[mapKey, mapValue]`.<br />
Regardless from how `Error`'s properties are serialized, the `this` context is the `Error` itself, the `key` can be one
of `"cause"`, `"message"`, `"name"` or `"stack"` and the `value` is the property value.

# Compatibility

Requires **Node.js v14**.

The package is tested under [all Node.js versions](https://app.travis-ci.com/github/iccicci/next-json)
currently supported accordingly to [Node.js Release](https://github.com/nodejs/Release#readme).

# TypeScript

**TypeScript** types are distributed with the package itself.

# License

[MIT License](https://github.com/iccicci/next-json/blob/master/LICENSE)

# Bugs

Do not hesitate to report any bug or inconsistency [@github](https://github.com/iccicci/next-json/issues).

# Donating

If you find useful this package, please consider the opportunity to donate some satoshis to this bitcoin address:
**1Md9WFAHrXTb3yPBwQWmUfv2RmzrtbHioB**

# See also

Other projects which aim to solve similar problems:

- [arson](https://github.com/benjamn/arson) by Ben Newman
- [devalue](https://github.com/Rich-Harris/devalue) by Rich Harris
- [jsesc](https://github.com/mathiasbynens/jsesc) by Mathias Bynens
- [lave](https://github.com/jed/lave) by Jed Schmidt
- [oson](https://github.com/KnorpelSenf/oson) by Steffen Trog
- [serialize-javascript](https://github.com/yahoo/serialize-javascript) by Eric Ferraiuolo
- [superjson](https://github.com/blitz-js/superjson) by Blitz
- [tosource](https://github.com/marcello3d/node-tosource) by Marcello Bast&eacute;a-Forte
