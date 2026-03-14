import { Bool, BoolPrimitive, Flt, FltPrimitive, Int, IntPrimitive, Slice, SlicePrimitive, Str, StrPrimitive, Uint, UintPrimitive } from "../classes";
import { ArrPrimitive, ObjPrimitive } from "../containers";

export type MpClassUnion = Uint | Int | Flt | Bool | Str | Slice;
export type MpPrimitiveUnion = UintPrimitive | IntPrimitive | FltPrimitive | BoolPrimitive | StrPrimitive | SlicePrimitive | ArrPrimitive | ObjPrimitive | null;
