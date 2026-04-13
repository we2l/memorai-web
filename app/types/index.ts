export interface User {
  id: string
  name: string
  email: string
  plan: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
