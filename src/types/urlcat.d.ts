// urlcat@3 ships `dist/index.d.ts`, but its package `exports` map omits a
// `types` condition, so under `moduleResolution: "bundler"` TypeScript cannot
// locate the bundled declarations. Provide a minimal ambient declaration that
// matches the subset of the API the project uses.
declare module 'urlcat' {
    type ParamMap = Record<string, unknown>

    function urlcat(baseUrl: string, pathTemplate: string, params: ParamMap): string
    function urlcat(baseTemplate: string, params: ParamMap): string
    function urlcat(baseUrl: string, pathTemplate: string): string

    export default urlcat
}
