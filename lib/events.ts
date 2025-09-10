// Simple pub-sub for server-sent events (SSE) to push real-time alerts.

type DetectionEvent = {
  type: 'detection'
  id: string
  severity: number
  message: string
  timestamp: string
}

type ValidationEvent = {
  type: 'validation'
  message: string
  isValid: boolean
  timestamp: string
}

export type AlertEvent = DetectionEvent | ValidationEvent

type Listener = (event: AlertEvent) => void

const listeners = new Set<Listener>()

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function publish(event: AlertEvent) {
  // Add timestamp if not present
  const eventWithTimestamp = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  }

  // Send to all active listeners
  for (const l of listeners) {
    try {
      l(eventWithTimestamp)
    } catch (e) {
      console.error("[v0] SSE listener error:", (e as Error).message)
    }
  }
}
