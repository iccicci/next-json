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

1. it offers an easy way to serialize complex data;
2. a valid JSON encoded string can be pasted in a JavaScript source file, a really awesome feature while developing / debugging.

... but it has some limitations:

- do not supports `undefined` values,
- do not supports `BigInt` numbers,
- do not supports many other features...

This package is intended to offer something as great as JSON... trying to add something more.

## NJSON Features

- &#9745; extends JSON
- &#9745; supports C style comments
- &#9745; supports `undefined` values
- &#9745; supports `BigInt` numbers
- &#9745; supports `Date` objects
- &#9744; supports `Error` objects
- &#9744; supports circular references

## NJSON extends JSON

This doesn't mean it's 100% compliant: due its higher number of supported features the result string of the
serialization through `NJSON.stringify` may differs from the result of the serialization through `JSON.stringify`.

On the other hand, the result of the deserialization of a _valid JSON encoded string_ through `NJSON.parse` will
produce a value _deep equal_ to the value produced by `JSON.parse`.

# Installation

With [npm](https://www.npmjs.com/package/next-json):

```sh
npm install --save next-json
```

# Usage

```typescript
import { NJSON, NjsonParseOptions, NjsonStringifyOptions } from "next-json";

const serialized: string = NJSON.stringify({ some: "value" });
const deserialized: { some: string } = NJSON.parse<{ some: string }>(serialized);
```

## NJSON.parse(text[, reviver])

Just for compatibility with `JSON.parse`. Alias for:

```typescript
NJSON.parse(value, { reviver });
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

- [`reviver`](#reviver):
  [&lt;Function>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) Alters the
  behavior of the deserialization process. **Default:** `null`.

### reviver

As the
[`reviver`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#parameters)
parameter of `JSON.parse`.

## interface NjsonStringifyOptions

- [`date`](#date):
  [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)
  Specifies `Date`s conversion method. **Default:** `"time"`.
- [`replacer`](#replacer):
  [&lt;Function>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
  [&lt;Array>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) Alters the
  behavior of the serialization process. **Default:** `null`.
- [`space`](#space):
  [&lt;number>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) |
  [&lt;string>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)
  Specifies the indentation. **Default:** `null`.
- [`undef`](#undef):
  [&lt;boolean>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
  Specifies the `undefined` behavior. **Default:** `true`.

### date

Specifies the method of `Date` objects used to serialize them. Follows the list of the allowed values and the relative
method used.

- `"iso"`: `toISOString`
- `"string"`: `toString`
- `"time"`: `getTime` - the default
- `"utc"`: `toUTCString`

### replacer

As the
[`replacer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters)
parameter of `JSON.serialize`.

### space

As the
[`space`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters)
parameter of `JSON.serialize`.

### undef

For default `NJSON.stringify` serializes `undefined` values as well. If set to `false`, `undefined` values are treated as `JSON.stringify` does.

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
