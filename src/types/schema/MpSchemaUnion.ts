import { MpSchemaEntry } from "./MpSchemaEntry";

export type MpSchemaUnion = MpSchemaEntry[] & { [MP_SYM_UNION]: true; };
export const MP_SYM_UNION = Symbol("UNION");
