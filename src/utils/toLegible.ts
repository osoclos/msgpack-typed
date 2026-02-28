export function toLegible(data: number | bigint, toHex?: false): string;
export function toLegible(data: number | bigint, toHex: true, minLen?: number): string;
export function toLegible(data: string, useBackticks?: boolean): string;
export function toLegible(data: any): string;
export function toLegible(data: any, b?: boolean, c?: number): string {
    if (typeof data === "number" || typeof data === "bigint") {
        b ??= false;
        c ??= 2;

        let str = typeof data === "number" && Object.is(data, -0.0) ? "-0" : data.toString(b ? 16 : 10);

        if (b) {
            const isNeg = str.startsWith("-");

            str = "0x" + str.slice(+isNeg).padStart(c, "0");
            if (isNeg) str = "-" + str;
        }

        return str;
    }

    if (typeof data === "string") {
        b ??= false;

        const quote = b ? "`" : "\"";
        return quote + data + quote;
    }

    return typeof data === "symbol" ? data.toString() : `${data}`;
}
