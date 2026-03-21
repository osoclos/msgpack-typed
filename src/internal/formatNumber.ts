export type NumberBase = "DECIMAL" | "HEX" | "BINARY" | "OCTAL";
export interface NumberFormat {
    base: NumberBase;

    separator?: string;
    periodLen?: number;

    addPrefix?: boolean;

    minLen?: number;
}

export function formatNumber(data: number | bigint, base: NumberBase): string;
export function formatNumber(data: number, fmt: NumberFormat): string;
export function formatNumber(data: bigint, fmt: NumberFormat & { addBigIntSuffix?: boolean; }): string;
export function formatNumber(data: number | bigint, b: NumberBase | NumberFormat): string {
    let str: string;

    const base = typeof b === "string" ? b : b.base;

    if (base === "DECIMAL") str = data.toString();
    else {
        const radix =
            base === "HEX"
                ? 16 :
            base === "BINARY"
                ? 2
                : 8;

        str = data.toString(radix);
    }

    const periodLen =
        typeof b === "object" && "periodLen" in b
            ? b.periodLen
            : base === "DECIMAL"
                ? 3
                : 4;

    const segments: string[] = Array(Math.ceil(str.length / periodLen));
    for (let iCharStart: number = str.length - periodLen, iCharEnd: number = str.length, iSegment: number = segments.length - 1; iSegment >= 0; iCharStart = iCharStart < periodLen ? 0 : iCharStart - periodLen, iCharEnd -= periodLen, iSegment--)
        segments[iSegment] = str.slice(iCharStart, iCharEnd);

    const separator = typeof b === "object" && "separator" in b ? b.separator : "_";

    str = segments.join(separator);

    const minLen =
        typeof b === "object" && "minLen" in b
            ? b.minLen
            : base === "DECIMAL"
                ? 0
            : base === "HEX"
                ? 2
                : 4;

    str = str.padStart(minLen, "0");

    if (base === "DECIMAL") return str;

    const addPrefix = typeof b === "object" && "addPrefix" in b ? b.addPrefix : true;
    if (!addPrefix) return str;

    switch (base) {
        case "HEX": return "0x" + str;
        case "BINARY": return "0b" + str;
        case "OCTAL": return "0o" + str;

        default: break;
    }

    return str;
}
