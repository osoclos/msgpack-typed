import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";

export type MpClassUnion = typeof Uint | typeof Int | typeof Flt | typeof Bool | typeof Str | typeof Bfr;
export const MP_CLASS_LIST = [Uint, Int, Flt, Bool, Str, Bfr] as const;
