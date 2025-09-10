import type { NextRequest } from "next/server"
import { subscribe } from "@/lib/events"

export const dynamic = "force-dynamic"

// Server-Sent Events for real-time alerts
export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()
  let isStreamActive = true

  // Create stream with proper error handling and cleanup
  const stream = new ReadableStream({
    start(controller) {
      // Set up event subscription
      const unsubscribe = subscribe((event) => {
        if (isStreamActive) {
          try {
            const payload = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(payload))
          } catch (error) {
            console.error('Error sending event:', error)
            isStreamActive = false
          }
        }
      })

      // Send initial connection message
      controller.enqueue(encoder.encode(": connected\n\n"))

      // Set up keep-alive mechanism
      let keepAliveTimeout: NodeJS.Timeout | null = null
      const keepAlive = () => {
        if (isStreamActive) {
          try {
            controller.enqueue(encoder.encode(":\n\n"))
            keepAliveTimeout = setTimeout(keepAlive, 15000)
          } catch (error) {
            console.error('Keep-alive error:', error)
            isStreamActive = false
            if (keepAliveTimeout) {
              clearTimeout(keepAliveTimeout)
            }
          }
        }
      }

      // Start initial keep-alive timeout
      keepAliveTimeout = setTimeout(keepAlive, 15000)

      // Return cleanup function
      return () => {
        isStreamActive = false
        if (keepAliveTimeout) {
          clearTimeout(keepAliveTimeout)
        }
        unsubscribe()
      }
    },
    pull(_controller) {
      // Optional: implement backpressure handling
    },
    cancel() {
      isStreamActive = false
    }
  })

  // Return the stream with appropriate headers
  return new Response(stream, {
    headers: new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })
  })
}
