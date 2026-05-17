import { MP_CLASS_LIST } from "../MpUnion";

import { MpSchemaKey } from "./MpSchemaKey";

import { MpSchemaArr } from "./MpSchemaArr";
import { MpSchemaObj } from "./MpSchemaObj";

import { MpSchemaUnion } from "./MpSchemaUnion";

export type MpSchemaEntry = typeof MP_CLASS_LIST[number] | MpSchemaArr<number> | MpSchemaObj<MpSchemaKey> | MpSchemaUnion;
