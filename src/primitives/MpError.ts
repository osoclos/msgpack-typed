import { type ConstructorChild } from "../utils";

export const MpError = {
    InvalidValue: class extends Error {
        constructor(nameCls: string, nameReason: "CONSTRUCTOR" | "ASSIGNMENT" | "ENCODING" | "MAP_SUBTYPE") {
            let cause: string;
            switch (nameReason) {
                case "CONSTRUCTOR": { cause = `Tried to create ${nameCls} with an invalid value.`; break; }
                case "ASSIGNMENT": { cause = `Tried to assign an invalid value in ${nameCls}.`; break; }

                case "ENCODING": { cause = `Invalid value used when encoding ${nameCls}.`; break; }

                case "MAP_SUBTYPE": { cause = `Tried to match an invalid value to a subtype in ${nameCls}.`; break; }

                default: { cause = "Unknown Reason"; break; }
            }

            super(`Invalid value was used in ${nameCls}.`, { cause });
        }
    },

    InvalidCode: class extends Error {
        constructor(nameCls: string, nameReason: "MAP_SUBTYPE" | "UNSUPPORTED",

            code: number
        ) {
            const codeHex = "0x" + code.toString(16).padStart(2, "0");

            let cause: string;
            switch (nameReason) {
                case "MAP_SUBTYPE": { cause = `Tried to match an unsupported code ${codeHex} to a subtype in ${nameCls}.`; break; }
                case "UNSUPPORTED": { cause = `Unsupported code ${codeHex} was found in chunk header supposedly for ${nameCls}.`; break; }

                default: { cause = "Unknown Reason"; break; }
            }

            super(`Code ${codeHex} does not satisfy the range of codes that ${nameCls} supports.`, { cause });
        }
    },

    InvalidSubtype: class extends Error {
        constructor(nameCls: string, nameReason: "CONSTRUCTOR" | "ASSIGNMENT", subtype: string) {
            let cause: string;
            switch (nameReason) {
                case "CONSTRUCTOR": { cause = `Tried to create ${nameCls} with subtype "${subtype}".`; break; }
                case "ASSIGNMENT": { cause = `Tried to assign an invalid subtype "${subtype}" in ${nameCls}.`; break; }

                default: { cause = "Unknown Reason"; break; }
            }

            super(`Subtype "${subtype}" does not exist in ${nameCls}.`, { cause });
        }
    },

    MissingCode: class extends Error {
        constructor(nameCls: string, nameReason: "VALIDATE_CHUNK") {
            let cause: string;
            switch (nameReason) {
                case "VALIDATE_CHUNK": { cause = "Tried to validate a chunk with no header code."; break; }
                default: { cause = "Unknown Reason"; break; }
            }

            super(`Chunk for ${nameCls} has a missing header code.`, { cause });
        }
    },

    TruncatedChunk: class extends Error {
        constructor(nameCls: string, nameReason: "DECODING", lenExpected: number, lenActual: number) {
            let cause: string;
            switch (nameReason) {
                case "DECODING": { cause = `Tried to decode a chunk for ${nameCls}.`; break; }
                default: { cause = "Unknown Reason"; break; }
            }

            super(`Expected a chunk of at least ${lenExpected} bytes, but received ${lenActual} bytes.`, { cause });
        }
    },

    NoImpl: class extends Error {
        constructor(nameCls: string, nameReason: string) {
            super(`${nameCls}::${nameReason} does not have an implementation!`);
        }
    }
} satisfies Record<string, ConstructorChild<Error>>;
