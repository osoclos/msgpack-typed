import { Bool, BoolPrimitive, Flt, FltPrimitive, Int, IntPrimitive, Slice, SlicePrimitive, Str, StrPrimitive, Uint, UintPrimitive } from "../classes";

export type MpClassUnion = Uint | Int | Flt | Bool | Str | Slice;
export type MpPrimitiveUnion = UintPrimitive | IntPrimitive | FltPrimitive | BoolPrimitive | StrPrimitive | SlicePrimitive | null;
