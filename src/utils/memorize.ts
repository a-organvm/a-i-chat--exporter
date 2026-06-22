type MemorizedFunction<Args extends readonly unknown[], Result> = (...args: Args) => Result

const generateKey = (args: readonly unknown[]): string => JSON.stringify(args)

export function memorize<Args extends readonly unknown[], Result>(fn: MemorizedFunction<Args, Result>): MemorizedFunction<Args, Result> {
    const cache = new Map<string, Result>()

    const memorized = (...args: Args): Result => {
        const key = generateKey(args)
        if (cache.has(key)) {
            return cache.get(key)!
        }
        const result = fn(...args)
        cache.set(key, result)
        return result
    }

    return memorized
}
