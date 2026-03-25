import __initMathModule from "./math.wat";
import __initHashTableModule from "./hash-table.wat";

import __initLz4BlockModule from "./lz4-block.wat";

export async function initMathModule(): Promise<MathModuleExports> {
    return __initMathModule<MathModuleExports>();
}

export async function initHashTableModule(imports: HashTableModuleImports = {}): Promise<HashTableModuleExports> {
    imports.options ??= {};
    imports.options.nHashBits ??= 12;

    return __initHashTableModule<HashTableModuleExports, Required<HashTableModuleImports>>(<Required<HashTableModuleImports>>imports);
}

export async function initLz4BlockModule(imports: Lz4BlockModuleImports): Promise<Lz4BlockModuleExports> {
    return __initLz4BlockModule<Lz4BlockModuleExports, Required<Lz4BlockModuleImports>>(imports);
}

export interface MathModuleExports {
    min(a: number, b: number): number;
    minUnsigned(a: number, b: number): number;

    max(a: number, b: number): number;
    maxUnsigned(a: number, b: number): number;
}

export interface HashTableModuleImports { options?: { nHashBits?: number; } }
export interface HashTableModuleExports {
    get(key: number): number;
    getByIdx(i: number): number;

    set(key: number, item: number): void;
    setByIdx(i: number, item: number): void;

    displace(key: number, newItem: number): number;

    fillMemory(byte: number): void;
}

export interface Lz4BlockModuleImports {
    math: MathModuleExports;
    hashTable: HashTableModuleExports;
}

export interface Lz4BlockModuleExports {
    encode(len: number): number;
    decode(len: number): number;

    growPreEncode(len: number): void;
    growPreDecode(len: number): void;

    memory: WebAssembly.Memory;
}
