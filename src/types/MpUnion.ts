import { Bool, BoolPrimitive, Flt, FltPrimitive, Int, IntPrimitive, Slice, SlicePrimitive, Str, StrPrimitive, Uint, UintPrimitive } from "../classes";
import { Arr, ArrPrimitive, Obj, ObjPrimitive } from "../containers";

export type MpClassUnion = Uint | Int | Flt | Bool | Str | Slice;
export type MpPrimitiveUnion = UintPrimitive | IntPrimitive | FltPrimitive | BoolPrimitive | StrPrimitive | SlicePrimitive | ArrPrimitive | ObjPrimitive | null;

export const MP_CLASS_CONTAINER_UNION_LIST = [Uint, Int, Flt, Str, Bool, Slice, Arr, Obj] as const;
