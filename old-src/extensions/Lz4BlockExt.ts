import { Ext } from "../classes";
import { Lz4BlockModuleExports, initMathModule, initHashTableModule, initLz4BlockModule } from "../modules";

import { RawClass } from "../types";

export class Lz4BlockExt extends Ext<RawClass<unknown, any[]>, 0x62 | 0x63> {
    /** Creates an extension that adds compression and decompression to MessagePack chunks. Not to be used in isolation. */
    constructor(public lz4Block: Lz4BlockModuleExports, public maxBlockSize: number = 8192 /* 2 ^ 13 */) {
        super([0x62, 0x63], <RawClass<unknown, any[]>><unknown>null);
    }

    /** Creates an extension that adds compression and decompression to MessagePack chunks. Not to be used in isolation. */
    static async create(maxBlockSize?: number, nHashBits?: number): Promise<Lz4BlockExt> {
        const math = await initMathModule();
        const hashTable = await initHashTableModule({ options: <any>{ nHashBits } });

        const lz4Block = await initLz4BlockModule({ math, hashTable, debug: { log: console.log } });

        return new Lz4BlockExt(lz4Block, maxBlockSize);
    }

    override encode(_data: unknown): Uint8Array {
        throw new Error("Lz4BlockExt does not support calling of `encode` in isolation. Use `encodeGeneric` and add this extension class as one of the available extensions or use `mpLz4Pack`.");
    }

    override decode<D extends unknown>(_bfr: Uint8Array, _code: 0x62 | 0x63): D {
        throw new Error("Lz4BlockExt does not support calling of `decode` in isolation. Use `decodeGeneric` and add this extension class as one of the available extensions or use `mpLz4Unpack`.");
    }

    [Symbol.toStringTag]: string = Lz4BlockExt.name;
}
