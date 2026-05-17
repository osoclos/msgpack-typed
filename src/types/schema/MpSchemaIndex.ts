import { Range } from "../../utils";

export const MP_SYM_RANGE = Symbol("RANGE");
export type MpSchemaIndex<L extends number, _I = Range<0, L>> = _I | _I[] | ([_I, _I | L] & { [MP_SYM_RANGE]: true; });
