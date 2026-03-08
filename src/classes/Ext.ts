import { RawClass } from "../types";
import { toLegible } from "../utils";

export abstract class Ext<T extends RawClass<any, any[]>, C extends number> {
    #codes: C[];
    #classes: T[];

    /** Creates an extension that adds support for a single custom class for MessagePack parsing given a single extension code. Requires overriding or extension.
     *
     * @abstract
     *
     */
    constructor(code: C, Cls: T);

    /** Creates an extension that adds support for a single custom class for MessagePack parsing given multiple extension codes. Requires overriding or extension.
     *
     * @abstract
     *
     */
    constructor(codes: C[], Cls: T);

    /** Creates an extension that adds support for custom classes for MessagePack parsing given a single extension code. Requires overriding or extension.
     *
     * @abstract
     *
     */
    constructor(code: C, classes: T[]);

    /** Creates an extension that adds support for custom classes for MessagePack parsing given multiple extension codes. Requires overriding or extension.
     *
     * @abstract
     *
     */
    constructor(codes: C[], classes: T[]);

    constructor(a: C | C[], b: T | T[]) {
        const codes = Array.isArray(a) ? [...a] : [a];
        if (codes.length === 0) throw new Error("No codes were provided for usage when creating the extension. Did you add any one-byte code into the extension?");

        this.#codes = [];

        for (const code of codes) {
            if (Number.isInteger(code)) {
                this.#codes.push(<C>((code >>> 0) & 0xff));
                continue;
            }

            console.warn(`Invalid code was passed into \`Ext\`. Did not expect ${toLegible(code)}. Skipping code...`);
        }

        const classes = Array.isArray(b) ? [...b] : [b];
        if (classes.length === 0) throw new Error("No classes were provided for usage when creating the extension. Did you add any classes into the extension?");

        this.#classes = classes;
    }

    get codes(): C[] {
        return [...this.#codes];
    }

    /** Encodes the class extension and converts it to a MessagePack chunk. Requires overriding or extension.
     *
     * @abstract
     *
     */
    abstract encode(data: T["prototype"]): Uint8Array | [Uint8Array, C];

    /** Decodes a class extension MessagePack chunk, validates it and parses it as this custom class. Requires overriding or extension.
     *
     * @abstract
     *
     */
    abstract decode<D extends T["prototype"]>(bfr: Uint8Array, code: C): D;

    /** Checks whether the extension support this code. */
    isCodeValid(code: number): code is C {
        return this.#codes.includes(<C>code);
    }

    /** Checks whether this custom class is supported by this extension. */
    isObjValid(obj: any): obj is T["prototype"] {
        for (const Cls of this.#classes)
            if (obj instanceof Cls) return true;

        return false;
    }
}
