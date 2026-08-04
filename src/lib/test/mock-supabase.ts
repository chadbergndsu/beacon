/**
 * Minimal fluent Supabase query-builder mock for unit/integration tests.
 * Supports chained .from().select().eq()… .maybeSingle() / .limit().maybeSingle().
 */

type Result = { data: unknown; error: unknown; count?: number | null }

export type MockTableHandler = (args: {
  filters: Record<string, unknown>
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
  payload?: unknown
}) => Result | Promise<Result>

export function createMockAdmin(handlers: Record<string, MockTableHandler>) {
  function table(name: string) {
    const state: {
      filters: Record<string, unknown>
      op: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
      payload?: unknown
      limitN?: number
    } = { filters: {}, op: 'select' }

    const api: Record<string, unknown> = {}
    const chain = () => api

    api.select = () => {
      // Supabase pattern: .update().eq().select() — select after write is "returning", not a new select
      if (state.op === 'select') {
        state.op = 'select'
      }
      return chain()
    }
    api.insert = (payload: unknown) => {
      state.op = 'insert'
      state.payload = payload
      return chain()
    }
    api.update = (payload: unknown) => {
      state.op = 'update'
      state.payload = payload
      return chain()
    }
    api.upsert = (payload: unknown) => {
      state.op = 'upsert'
      state.payload = payload
      return chain()
    }
    api.delete = () => {
      state.op = 'delete'
      return chain()
    }
    api.eq = (col: string, val: unknown) => {
      state.filters[col] = val
      return chain()
    }
    api.neq = (col: string, val: unknown) => {
      state.filters[`neq:${col}`] = val
      return chain()
    }
    api.gte = (col: string, val: unknown) => {
      state.filters[`gte:${col}`] = val
      return chain()
    }
    api.in = (col: string, val: unknown) => {
      state.filters[`in:${col}`] = val
      return chain()
    }
    api.ilike = (col: string, val: unknown) => {
      state.filters[`ilike:${col}`] = val
      return chain()
    }
    api.order = () => chain()
    api.limit = (n: number) => {
      state.limitN = n
      return chain()
    }
    api.single = async () => run()
    api.maybeSingle = async () => run()
    api.then = undefined // not a thenable by default

    async function run(): Promise<Result> {
      const h = handlers[name]
      if (!h) return { data: null, error: { message: `No mock for table ${name}` } }
      return h({ filters: state.filters, op: state.op, payload: state.payload })
    }

    // Allow await on builder when used without maybeSingle (rare)
    Object.defineProperty(api, 'then', {
      get() {
        return (resolve: (v: Result) => void, reject: (e: unknown) => void) => {
          run().then(resolve, reject)
        }
      },
    })

    return api
  }

  return {
    from: (name: string) => table(name),
  }
}
