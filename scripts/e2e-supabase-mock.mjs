import { createServer } from 'node:http'

const port = Number(process.env.E2E_SUPABASE_MOCK_PORT || '54329')

const server = createServer((request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ ok: true }))
    return
  }
  if (
    request.method === 'POST' &&
    request.url === '/rest/v1/rpc/public_inquiry_rate_limit_ready'
  ) {
    response.end('true')
    return
  }
  response.statusCode = 404
  response.end(JSON.stringify({ message: 'not found' }))
})

server.listen(port, '127.0.0.1')
