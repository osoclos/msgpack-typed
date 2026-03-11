import __initMathModule from "./math.wat";
import __initHashTableModule from "./hash-table.wat";

import __initLz4BlockModule from "./lz4-block.wat";

export function initMathModule(): Promise<MathModuleExports> {
    return __initMathModule<MathModuleExports>();
}

export function initHashTableModule(imports: HashTableModuleImports = {}): Promise<HashTableModuleExports> {
    imports.nHashBits ??= 12;
    return __initHashTableModule<HashTableModuleExports, Required<HashTableModuleImports>>(<Required<HashTableModuleImports>>imports);
}

export function initLz4BlockModule(imports: Lz4BlockModuleImports): Promise<Lz4BlockModuleExports> {
    return __initLz4BlockModule<Lz4BlockModuleExports, Required<Lz4BlockModuleImports>>(<Required<Lz4BlockModuleImports>>imports);
}

export interface MathModuleExports {
    min(a: number, b: number): number;
    minUnsigned(a: number, b: number): number;

    max(a: number, b: number): number;
    maxUnsigned(a: number, b: number): number;
}

export interface HashTableModuleImports { nHashBits?: number; }
export interface HashTableModuleExports {
    get(key: number): number;
    getByIdx(i: number): number;

    set(key: number, val: number): void;
    setByIdx(key: number, val: number): void;

    displace(key: number, val: number): number;

    fillWithByte(byte: number): void;
}

export interface Lz4BlockModuleImports {
    math: MathModuleExports;
    hashTable: HashTableModuleExports;
}

export interface Lz4BlockModuleExports {
    encode(len: number): number;
    decode(len: number): number;

    memory: WebAssembly.Memory;
}
