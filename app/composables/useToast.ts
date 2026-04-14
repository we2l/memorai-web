interface ToastState {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  visible: boolean
}

const state = reactive<ToastState>({
  message: '',
  type: 'success',
  visible: false,
})

let timeout: ReturnType<typeof setTimeout>

export function useToast() {
  function show(message: string, type: ToastState['type'] = 'success', duration = 3000) {
    clearTimeout(timeout)
    state.message = message
    state.type = type
    state.visible = true
    timeout = setTimeout(() => { state.visible = false }, duration)
  }

  return { state, show }
}
