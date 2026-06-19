import type { ConstructorChild, ExtractMethodNames } from "../utils";
import type { MpClassInterface, MpClassModule, MpClassInterfaceSubtyped, MpClassModuleSubtyped } from "./MpClass";

export const MpError = {
    InvalidValue: class extends Error {
        constructor(
            instance:
                MpClassInterface<unknown> |
                MpClassInterfaceSubtyped<unknown, string>,

            nameMethod:
                ExtractMethodNames<
                    MpClassInterface<unknown> | MpClassModule<unknown> |
                    MpClassInterfaceSubtyped<unknown, string> | MpClassModuleSubtyped<unknown, string>
                >
        ) {
            const nameCls = instance[Symbol.toStringTag];

            let cause: string;
            switch (nameMethod) {
                case "constructor" as any: { cause = `Tried to create ${nameCls} with an invalid value.`; break; }
                case "value" as any: { cause = `Tried to assign a new value in ${nameCls} with an invalid value.`; break; }

                default: { cause = "Unknown Reason"; break; }
            }

            super(`Invalid value was used in ${nameCls}.`, { cause });
        }
    },

    InvalidCode: class extends Error {
        constructor(
            instance:
                MpClassInterface<unknown> |
                MpClassInterfaceSubtyped<unknown, string>,

            nameMethod:
                ExtractMethodNames<
                    MpClassInterface<unknown> | MpClassModule<unknown> |
                    MpClassInterfaceSubtyped<unknown, string> | MpClassModuleSubtyped<unknown, string>
                >,

            code: number
        ) {
            const nameCls = instance[Symbol.toStringTag];
            const codeHex = "0x" + code.toString(16).padStart(2, "0");

            let cause: string;
            switch (nameMethod) {
                case "code2Subtype": { cause = `Tried to match a subtype from ${nameCls} to code ${codeHex}.`; break; }
                case "deriveChunkIndices": { cause = `Unsupported code ${codeHex} was found in chunk header supposedly for ${nameCls}.`; break; }

                default: { cause = "Unknown Reason"; break; }
            }

            super(`Code ${codeHex} does not satisfy the range of codes that ${nameCls} supports.`, { cause });
        }
    },

    InvalidSubtype: class extends Error {
        constructor(instance: MpClassInterfaceSubtyped<unknown, string>, nameMethod: ExtractMethodNames<MpClassInterfaceSubtyped<unknown, string> | MpClassModuleSubtyped<unknown, string>>, subtype: string) {
            const nameCls = instance[Symbol.toStringTag];

            let cause: string;
            switch (nameMethod) {
                case "constructor" as any: { cause = `Tried to create ${nameCls} with subtype "${subtype}".`; break; }
                case "subtype" as any: { cause = `Tried to assign an invalid subtype "${subtype}" in ${nameCls}.`; break; }

                default: { cause = "Unknown Reason"; break; }
            }

            super(`Subtype "${subtype}" does not exist in ${nameCls}.`, { cause });
        }
    },

    MissingCode: class extends Error {
        constructor(
            _instance:
                MpClassInterface<unknown> |
                MpClassInterfaceSubtyped<unknown, string>,

            nameMethod:
                ExtractMethodNames<
                    MpClassInterface<unknown> | MpClassModule<unknown> |
                    MpClassInterfaceSubtyped<unknown, string> | MpClassModuleSubtyped<unknown, string>
                >
        ) {
            let cause: string;
            switch (nameMethod) {
                case "isChunkValid": { cause = "Tried to validate a chunk with no header code."; break; }
                default: { cause = "Unknown Reason"; break; }
            }

            super("Chunk has a missing header code.", { cause });
        }
    },

    TruncatedChunk: class extends Error {
        constructor(
            instance:
                MpClassInterface<unknown> |
                MpClassInterfaceSubtyped<unknown, string>,

            nameMethod:
                ExtractMethodNames<
                    MpClassInterface<unknown> | MpClassModule<unknown> |
                    MpClassInterfaceSubtyped<unknown, string> | MpClassModuleSubtyped<unknown, string>
                >,

            lenExpected: number,
            lenActual: number
        ) {
            const nameCls = instance[Symbol.toStringTag];

            let cause: string;
            switch (nameMethod) {
                case "decode": { cause = `Tried to decode a chunk for ${nameCls}.`; break; }
                default: { cause = "Unknown Reason"; break; }
            }

            super(`Expected a chunk of at least ${lenExpected} bytes, but received ${lenActual} bytes.`, { cause });
        }
    },

    NoImpl: class extends Error {
        constructor(
            instance:
                MpClassInterface<unknown> |
                MpClassInterfaceSubtyped<unknown, string>,

            nameMethod:
                ExtractMethodNames<
                    MpClassInterface<unknown> | MpClassModule<unknown> |
                    MpClassInterfaceSubtyped<unknown, string> | MpClassModuleSubtyped<unknown, string>
                >
        ) {
            const nameCls = instance[Symbol.toStringTag];
            super(`${nameCls}::${nameMethod} does not have an implementation!`);
        }
    }
} satisfies Record<string, ConstructorChild<Error>>;
