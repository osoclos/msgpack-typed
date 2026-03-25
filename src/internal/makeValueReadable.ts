export function makeValueReadable(data: unknown, maxDepth: number = 3): string {
    return parseValue(data, 0, maxDepth);
}

function parseValue(data: unknown, depth: number, maxDepth: number): string {
    if (typeof data === "string") return /^0([bB][01_]+|[xX][\dabcdefABCDEF_]+|[oO][01234567_]+)n?$/gm.test(data) ? data : `"${data}"`;

    if (depth < maxDepth) {
        if (Array.isArray(data)) {
            let arr = data;

            let overflowingLen: number | null = null;
            if (arr.length > 100) {
                overflowingLen = arr.length - 100;
                arr = arr.slice(0, 100);
            }

            return `[${arr.map((item) => parseValue(item, depth + 1, maxDepth)).join(", ")}${overflowingLen === null ? "]" : `, ...${overflowingLen} more items]`}`;
        }

        if (data instanceof Set) {
            let set = data;

            const overflowingLen: number | null = set.size > 100 ? set.size - 100 : null;

            let segments: string[] = [];

            let i: number = 0;
            for (const item of set) {
                if (i >= 100) break;

                segments.push(parseValue(item, depth + 1, maxDepth));
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

            segments.push(parseValue(key, depth + 1, maxDepth) + "= " + parseValue(item, depth + 1, maxDepth));
            i++;
        }

        return `Map(${segments.join(", ")}${overflowingLen === null ? ")" : `, ...${overflowingLen} more items)`}`;
    }

    return `${data}`;
}
