export class InvalidDataTypeError extends TypeError {
    #maxDepth: number;

    constructor(data: unknown, maxDepth: number = 3) {
        super();

        this.name = InvalidDataTypeError.name;
        this.message = `An invalid value type was passed into the wrapper; did not expect value (${this.#parse(data, 0)}).`;

        this.#maxDepth = maxDepth;
    }

    #parse(data: unknown, depth: number): string {
        if (typeof data === "string") return /^0([bB][01_]+|[xX][\dabcdefABCDEF_]+|[oO][01234567_]+)n?$/gm.test(data) ? data : `"${data}"`;

        if (depth < this.#maxDepth) {
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

                let segments: string[] = [];

                let i: number = 0;
                for (const item of set) {
                    if (i >= 100) break;

                    segments.push(this.#parse(item, depth + 1));
                    i++;
                }

                return `Set(${segments.join(", ")}${overflowingLen === null ? ")" : `, ...${overflowingLen} more items)`}`;
            }
        }

        if (data instanceof Map) {
            let map = data;

            const overflowingLen: number | null = map.size > 100 ? map.size - 100 : null;

            let segments: string[] = [];

            let i: number = 0;
            for (const [key, item] of map) {
                if (i >= 100) break;

                segments.push(this.#parse(key, depth + 1) + "= " + this.#parse(item, depth + 1));
                i++;
            }

            return `Map(${segments.join(", ")}${overflowingLen === null ? ")" : `, ...${overflowingLen} more items)`}`;
        }

        return `${data}`;
    }
}
