import { MpSchemaEntry } from "./MpSchemaEntry";
import { MpSchemaKey } from "./MpSchemaKey";

export interface MpSchemaObj<K extends MpSchemaKey> {
    type: "MAP";

    keys: K[];
    values: K | [K, MpSchemaEntry][];
}
