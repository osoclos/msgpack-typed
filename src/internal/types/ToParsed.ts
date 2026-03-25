import { Bfr, BfrPrimitive, Bool, BoolPrimitive, Flt, FltPrimitive, Int, IntPrimitive, Str, StrPrimitive, Uint, UintPrimitive } from "../../classes"

export type ToParsed<T extends Exclude<unknown, undefined | symbol>> =
    T extends typeof Uint["prototype"]
        ? UintPrimitive :
    T extends typeof Int["prototype"]
        ? IntPrimitive :
    T extends typeof Flt["prototype"]
        ? FltPrimitive :
    T extends typeof Bool["prototype"]
        ? BoolPrimitive :
    T extends typeof Str["prototype"]
        ? StrPrimitive :
    T extends typeof Bfr["prototype"]
        ? BfrPrimitive
        : T;
