import { Bfr, BfrPrimitive, Bool, BoolPrimitive, Flt, FltPrimitive, Int, IntPrimitive, Str, StrPrimitive, Uint, UintPrimitive } from "../classes";
import { Arr, Obj } from "../containers";

export type MpClassUnion = typeof Uint | typeof Int | typeof Flt | typeof Bool | typeof Str | typeof Bfr;
export type MpContainerUnion = typeof Arr | typeof Obj;

export type MpPrimitiveUnion = UintPrimitive | IntPrimitive | FltPrimitive | BoolPrimitive | StrPrimitive | BfrPrimitive;

export const MP_CLASS_LIST = [Uint, Int, Flt, Bool, Str, Bfr] as const;
export const MP_CONTAINER_LIST = [Arr, Obj];
