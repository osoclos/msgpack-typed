import { RawClass } from "../internal";
import { ExtUtils } from "../utils";

export abstract class Ext<T extends RawClass<unknown>, C extends number, S extends boolean = false> {
    #codes: C[];

    #isEncodable: (data: unknown) => data is T["prototype"];
    #isDecodable: (chunk: Uint8Array) => boolean | [number, number];

    protected constructor(codes: C | C[], classes: T | T[]);
    protected constructor(codes: C | C[], predicate :   (data: unknown) => data is T);
    protected constructor(codes: C | C[], predicates: [((data: unknown) => data is T) | null, ((chunk: Uint8Array) => boolean) | null]);
    protected constructor(codes: C | C[], b: T | T[] | ((data: unknown) => data is T) | [((data: unknown) => data is T) | null, ((chunk: Uint8Array) => boolean) | null]) {
        this.#codes = Array.isArray(codes) ? [...codes] : [codes];

        const isArr = Array.isArray(b);

        if (!Ext.#isClass(b) || (isArr && b.length === 2 && !(<any[]><unknown>b).some((func) => Ext.#isClass(func)))) {
            if (isArr) {
                [this.#isEncodable, this.#isDecodable] = <any>b;
                return;
            }

            this.#isEncodable = <any>b;
            this.#isDecodable = this.#isExtChunkSupported;

            return;
        }

        if (!isArr) b = [b];

        this.#isEncodable = (data: unknown): data is T["prototype"] => (<any[]><unknown>b).some((Cls) => data instanceof Cls);
        this.#isDecodable = this.#isExtChunkSupported;
    }

    abstract encode(data: T["prototype"]): [Uint8Array, C];
    abstract decode(chunk: Uint8Array, code: true extends S ? C | null : C): T["prototype"];

    isEncodable(data: unknown): data is T["prototype"] {
        return this.#isEncodable(data);
    }

    isDecodable(chunk: Uint8Array): boolean | [number, number] {
        return this.#isDecodable(chunk);
    }

    isCodeValid(code: number): code is C {
        return this.#codes.includes(<C>code);
    }

    skipHeaderDecoding(_chunk: Uint8Array): S {
        return <S>false;
    }

    #isExtChunkSupported(chunk: Uint8Array): boolean {
        if (!ExtUtils.isChunkValid(chunk)) return false;

        const [, extCode] = ExtUtils.decodeRaw(chunk);
        return this.isCodeValid(extCode);
    }

    static #isClass<T>(func: unknown): func is RawClass<T> {
        return typeof func === "function" && ((func.prototype !== undefined && func.prototype !== null && Object.getOwnPropertyNames(func.prototype).length > 1) || Function.prototype.toString.call(func).startsWith("class"));
    }
}
