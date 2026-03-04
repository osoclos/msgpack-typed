import { Bool, BoolPrimitive, Flt, FltPrimitive, Int, IntPrimitive, Slice, SlicePrimitive, Str, StrPrimitive, Uint, UintPrimitive } from "../classes";

export type MpClassUnion = Uint | Int | Flt | Bool | Str | Slice;
export type MpPrimitiveUnion = UintPrimitive | IntPrimitive | FltPrimitive | BoolPrimitive | StrPrimitive | SlicePrimitive | null;

export const MP_CLASS_CONTAINER_UNION_LIST = [Uint, Int, Flt, Str, Bool, Slice] as const;
