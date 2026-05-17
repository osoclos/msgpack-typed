import { MpSchemaEntry } from "./MpSchemaEntry";
import { MpSchemaIndex } from "./MpSchemaIndex";

export interface MpSchemaArr<L extends number, _I = MpSchemaIndex<L>> {
    type: "ARR";
    values: MpSchemaEntry | [_I, MpSchemaEntry][];

    length: _I;
}
