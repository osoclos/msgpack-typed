# msgpack-typed

A MessagePack encoder and decoder implementation focused on type preservation and interoperability with other codecs

> [!WARNING]
>
> This port has not been battle-tested (to the point of full confidence) and bugs may still appear. Do not use this in production code unless necessary.

## Features

The list of features part of this port of MessagePack includes:

- Generic encoding and decoding of any valid MessagePack chunks
- Type preservation (with separate numeric types)

- LZ4 block compression/decompression (same as the [Official MessagePack C# port](https://github.com/MessagePack-CSharp/MessagePack-CSharp))

- Creation of modular and powerful extensions.

## Usage

- General Encoding/Decoding

``` ts
const chunkReceived = new Uint8Array(await fetch("./chunk-received.dat").then((res) => res.arrayBuffer()));

const dataDecoded = decodeAny(chunkReceived, [/** any specified extensions to include */]);

// extract the raw values
if (Arr.isValueValid(dataDecoded)) console.log(Arr.parse(dataDecoded));
else if (Obj.isValueValid(dataDecoded)) console.log(Obj.parse(dataDecoded));
else console.log(dataDecoded.value);
```

- Typed Parsers

``` ts
const chunkUncasted = encodeAny(72); // will be encoded as an Uint (fixint)

const chunkCasted = encodeAny(new Int(72, "I32")); // will be encoded as an Int with the int32 code.
```

- Using with LZ4 Compression

``` ts
import { decodeAny, encodeAny, LZ4Compression } from "msgpack-typed";

await LZ4Compression.initModules();

const chunkCompressed = new Uint8Array(await fetch("./chunk-compressed.dat").then((res) => res.arrayBuffer()));

const dataDecoded = decodeAny(chunkCompressed, [], true /* enable decompression */);
console.log(dataDecoded); // use decoded data

const chunkRecompressed = encodeAny(dataDecoded, [], true /** enable compression */);
```

### Modifying Content Security Policies (CSP)

If you are using `msgpack-typed`'s `LZ4Compression` module and have strict Content Security Policies, make sure to add `'wasm-unsafe-eval'` into your `script-src` policy.

``` html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'wasm-unsafe-eval';">
```

### Working with Vite

If you are using `msgpack-typed`'s `LZ4Compression` module with [Vite](https://vite.dev/), make sure to specify the package in the `optimizeDeps.exclude` option in its `vite-config.ts` file:

``` ts
import { defineConfig } from "vite";

export default defineConfig({
    // ... other options

    optimizeDeps: { exclude: ["msgpack-typed"] }
});
```

## Documentation

The documentation can be found as part of the source code, which can be viewed as a tooltip in your IDE. On-site documentation will be done when demand calls for it.
