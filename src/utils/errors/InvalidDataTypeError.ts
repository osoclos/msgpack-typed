export class InvalidDataTypeError extends TypeError {
    constructor(data: unknown) {
        super();

        this.name = InvalidDataTypeError.name;
        this.message = `Invalid type was passed into the wrapper; unexpected value ${this.#parse(data)}.`;
    }

    #parse(data: unknown, depth: number = 0): string {
        if (typeof data === "string") return /^0([bB][01_]+|[xX][\dabcdefABCDEF_]+|[oO][01234567_]+)n?$/gm.test(data) ? data : `"${data}"`;

        if (depth < 3) {
            if (Array.isArray(data)) {
                let arr = data;

                let overflowingLen: number | null = null;
                if (arr.length > 100) {
                    overflowingLen = arr.length - 100;
                    arr = arr.slice(0, 100);
                }

                return `[${arr.map((item) => this.#parse(item, depth + 1)).join(", ")}${overflowingLen === null ? "]" : `, ...${overflowingLen} more items]`}`;
            }

            if (data instanceof Set) {
                let set = data;

                const overflowingLen: number | null = set.size > 100 ? set.size - 100 : null;

                let str: string = "";

                let i: number = 0;
                for (const item of set) {
                    if (i >= 100) break;

                    if (i !== 0) str += ", ";
                    str += this.#parse(item, depth + 1);

                    i++;
                }

                return `Set(${str}${overflowingLen === null ? ")" : `, ...${overflowingLen} more items)`}`;
            }
        }

        if (data instanceof Map) {
            let map = data;

            const overflowingLen: number | null = map.size > 100 ? map.size - 100 : null;

            let str: string = "";

            let i: number = 0;
            for (const [key, item] of map) {
                if (i >= 100) break;

                if (i !== 0) str += ", ";
                str += this.#parse(key, depth + 1) + "= " + this.#parse(item, depth + 1);

                i++;
            }

            return `Map(${str}${overflowingLen === null ? ")" : `, ...${overflowingLen} more items)`}`;
        }

        return (
            data === undefined || data === null || typeof data === "boolean"
                ? `\`${data}\`` :
            typeof data!.toString === "function"
                ? data.toString()
                : `${data}`
        );
    }
}
