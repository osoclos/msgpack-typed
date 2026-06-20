import watInitMathModule from "./math.wat";
import watInitHashTableModule from "./hash-table.wat";

import watInitLz4BlockModule from "./lz4-block.wat";

export async function initMathModule(): Promise<MathModuleExports> {
    return watInitMathModule<MathModuleExports>();
}

export async function initHashTableModule(imports: HashTableModuleImports = {}): Promise<HashTableModuleExports> {
    imports.options ??= {};
    imports.options.nHashBits ??= 12;

    return watInitHashTableModule<HashTableModuleExports, HashTableModuleImports>(imports);
}

export async function initLZ4BlockModule(imports: LZ4BlockModuleImports): Promise<LZ4BlockModuleExports> {
    return watInitLz4BlockModule<LZ4BlockModuleExports, LZ4BlockModuleImports>(imports);
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

export interface LZ4BlockModuleImports {
    math: MathModuleExports;
    hashTable: HashTableModuleExports;
}

export interface LZ4BlockModuleExports {
    encode(len: number): number;
    decode(len: number): number;

    growPreEncode(len: number): number;
    growPreDecode(len: number): number;

    memory: WebAssembly.Memory;
}
