import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'

interface OrderItem {
  productId: string
  quantity: number
  price: number
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      name: 'Create Order',
      op: 'order',
    },
    async (span) => {
      try {
        const body = await request.json()
        const { userId, items } = body

        // Add initial delay to show spinner (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Simulate database timeout during order creation (60% chance)
        const shouldTimeout = Math.random() < 0.6
        
        if (shouldTimeout) {
          // Simulate database timeout with longer delay
          const startTime = Date.now()
          
          // Log database query start with Sentry's native logging
          const { logger } = Sentry
          logger.info('Database query started for order creation', {
            operation: 'create_order',
            userId,
            itemCount: items.length,
            component: 'database',
          })

          // Simulate a database timeout (7 seconds total - 2 initial + 5 timeout)
          await new Promise(resolve => setTimeout(resolve, 5000))
          
          const duration = Date.now() - startTime
          
          // Log timeout with Sentry's native logging
          logger.error('Database timeout occurred during order creation', {
            duration,
            operation: 'create_order',
            userId,
            itemCount: items.length,
            component: 'database',
          })

          // Create a more detailed error for Sentry
          const timeoutError = new Error(`Database timeout after ${duration}ms during order creation`)
          timeoutError.name = 'OrderCreationTimeoutError'
          
          // Add additional context to the error
          Sentry.setContext('order_creation_timeout', {
            duration,
            operation: 'create_order',
            userId,
            itemCount: items.length,
            timestamp: new Date().toISOString(),
          })

          // Set error level and tags
          Sentry.setTag('error_type', 'order_creation_timeout')
          Sentry.setTag('order_status', 'failed')
          Sentry.setTag('timeout_duration', duration.toString())
          
          // Capture the exception in Sentry
          Sentry.captureException(timeoutError, {
            tags: {
              error_type: 'order_creation_timeout',
              order_status: 'failed',
              timeout_duration: duration.toString(),
            },
            extra: {
              userId,
              itemCount: items.length,
              duration,
            },
          })
          
          throw timeoutError
        }

        let total = 0
        for (const item of items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId }
          })
          if (product) {
            total += parseFloat(product.price.toString()) * item.quantity
          }
        }

        const order = await prisma.order.create({
          data: {
            userId,
            total,
            orderItems: {
              create: items.map((item: OrderItem) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              }))
            }
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        })

        // Log successful order creation with Sentry's native logging
        const { logger } = Sentry
        logger.info('Order created successfully', {
          orderId: order.id,
          userId,
          itemCount: items.length,
          total,
          component: 'order',
          action: 'create',
        })

        return NextResponse.json(order, { status: 201 })
      } catch (error) {
        console.error('Error creating order:', error)
        
        // Log order creation failure with Sentry's native logging
        const { logger } = Sentry
        logger.error('Order creation failed', {
          userId: 'unknown',
          itemCount: 0,
          component: 'order',
          action: 'create',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
        
        // Add error context to Sentry
        if (error instanceof Error) {
          Sentry.setContext('order_creation_error', {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          })
        }

        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        )
      }
    }
  )
}