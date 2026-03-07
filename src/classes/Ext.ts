import { RawClass } from "../types";

export abstract class Ext<T extends RawClass<any, any[]>, C extends number> {
    #codes: C[];
    #classes: T[];

    constructor(code: C, Cls: T);
    constructor(codes: C[], Cls: T);

    constructor(code: C, classes: T[]);
    constructor(codes: C[], classes: T[]);

    constructor(a: C | C[], b: T | T[]) {
        this.#codes   = Array.isArray(a) ? [...a] : [a];
        this.#classes = Array.isArray(b) ? [...b] : [b];
    }

    abstract encode(data: T): Uint8Array | [Uint8Array, C];
    abstract decode<D extends T>(bfr: Uint8Array, code: C): D;

    isCodeValid(code: number): code is C {
        return this.#codes.includes(<C>code);
    }

    isObjValid(obj: any): obj is T["prototype"] {
        for (const Cls of this.#classes)
            if (obj instanceof Cls) return true;

        return false;
    }
}
