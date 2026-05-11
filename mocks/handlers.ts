import { http, HttpResponse } from 'msw'

export const handlers = [
  // Sample API handler
  http.get('/api/test', () => {
    return HttpResponse.json({ message: 'MSW is working!' })
  }),
]
