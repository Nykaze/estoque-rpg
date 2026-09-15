import { io, type Socket } from 'socket.io-client'
import { connected, connecting, applyState, pushToast } from './stores'

let socket: Socket | null = null

export function getSocket() {
  return socket
}

export function send(action: Record<string, any>) {
  socket?.emit('action', action)
}

export function connectSocket(): Promise<void> {
  return new Promise((resolve) => {
    socket = io({ autoConnect: true })

    socket.on('connect', () => connected.set(true))
    socket.on('disconnect', () => connected.set(false))

    socket.on('hello', (data: any) => {
      if (data?.systemName) {
        document.title = data.systemName
      }
    })

    socket.on('state', (s: any) => {
      applyState(s)
      connecting.set(false)
      resolve()
    })

    socket.on('connect_error', () => {
      connecting.set(false)
      resolve()
    })

    socket.on('actionError', (res: any) => {
      pushToast(res?.error || 'Erro na ação.', 'err')
    })
  })
}
