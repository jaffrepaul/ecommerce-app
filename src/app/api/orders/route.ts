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
  try {
    // Set the transaction name for better trace identification
    Sentry.setTag('transaction', 'Create Order')
    
    const body = await request.json()
    const { userId, items } = body

    // Add breadcrumb for order creation start
    Sentry.addBreadcrumb({
      category: 'order',
      message: 'Order creation started',
      level: 'info',
      data: {
        userId,
        itemCount: items?.length,
      },
    })

    // Validate userId
    if (!userId) {
      const error = new Error('userId is required')
      Sentry.captureException(error, {
        tags: {
          error_type: 'missing_user_id',
          order_status: 'failed',
        },
        extra: {
          body,
          items,
        },
      })
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Add user context to Sentry
    Sentry.setUser({
      id: userId,
    })

    // Add custom context
    Sentry.setContext('order_creation', {
      userId,
      itemCount: items?.length || 0,
      timestamp: new Date().toISOString(),
    })

    // Capture start time before any delays
    const startTime = Date.now()

    // Calculate total from items
    let total = 0
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })
      if (product) {
        total += parseFloat(product.price.toString()) * item.quantity
      }
    }

    // Create the order with real database operations
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

    // Log successful order creation with Sentry
    const { logger } = Sentry
    
    logger.info(logger.fmt`Order created successfully for user ${userId}`, {
      userId,
      orderId: order.id,
      itemCount: items.length,
      totalAmount: total,
      orderStatus: order.status,
      module: 'order',
      action: 'create_success',
      paymentAmount: total,
      items: items.map((item: OrderItem) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    })
    
    // Set success tags for Sentry
    Sentry.setTag('order_status', 'created')
    Sentry.setTag('user_id', userId)
    Sentry.setTag('order_id', order.id)
    Sentry.setTag('payment_amount', total.toString())
    Sentry.setTag('item_count', items.length.toString())

    // Add success context to Sentry
    Sentry.setContext('order_creation_success', {
      userId,
      orderId: order.id,
      itemCount: items.length,
      totalAmount: total,
      orderStatus: order.status,
      timestamp: new Date().toISOString(),
    })

    // Simulate database timeout 100% of the time for demo
    const shouldTimeout = false // Temporarily disabled for successful order generation
    
    if (shouldTimeout) {
      // Add breadcrumb for timeout simulation start
      Sentry.addBreadcrumb({
        category: 'database',
        message: 'Starting timeout simulation',
        level: 'info',
        data: {
          userId,
          itemCount: items.length,
        },
      })

      // Create a CUSTOM SPAN for the slow database query with searchable data
      await Sentry.startSpan(
        {
          name: 'Database Query - User Order History',
          op: 'db.query',
        },
        async () => {
          // Set tags for searchability in Sentry
          Sentry.setTag('user_id', userId)
          Sentry.setTag('operation', 'fetch_user_order_history')
          Sentry.setTag('query_type', 'setTimeout')
          Sentry.setTag('module', 'database')
          Sentry.setTag('item_count', items.length.toString())
          
          // Use setTimeout to simulate a slow database query
          // This will be tracked by Sentry's automatic instrumentation
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      )
      
      // Add breadcrumb for slow query completion
      Sentry.addBreadcrumb({
        category: 'database',
        message: 'Slow database query completed',
        level: 'info',
        data: {
          operation: 'fetch_user_order_history',
          duration: 500,
        },
      })
      
      // Add another slow query that should definitely be tracked by Sentry
      // This complex query will take time and be automatically instrumented
      
      // Add breadcrumb for findMany query start
      Sentry.addBreadcrumb({
        category: 'database',
        message: 'Starting complex findMany query',
        level: 'info',
        data: {
          operation: 'find_user_orders',
          userId,
        },
      })
      
      // Create a CUSTOM SPAN for the complex findMany query with searchable data
      await Sentry.startSpan(
        {
          name: 'Database Query - Complex FindMany',
          op: 'db.query',
        },
        async () => {
          // Set tags for searchability in Sentry
          Sentry.setTag('user_id', userId)
          Sentry.setTag('operation', 'find_user_orders')
          Sentry.setTag('query_type', 'findMany')
          Sentry.setTag('module', 'database')
          Sentry.setTag('item_count', items.length.toString())
          
          await prisma.order.findMany({
            where: {
              userId: {
                not: ''
              }
            },
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              user: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1000
          })
        }
      )
      
      // Add breadcrumb for findMany completion
      Sentry.addBreadcrumb({
        category: 'database',
        message: 'Complex findMany query completed',
        level: 'info',
        data: {
          operation: 'find_user_orders',
        },
      })
      
      const duration = Date.now() - startTime
      
      // Calculate total payment amount from items
      let totalPaymentAmount = 0
      for (const item of items) {
        totalPaymentAmount += item.price * item.quantity
      }
      
      // Log timeout with Sentry's native logging - including all required info
      logger.error('Database timeout occurred during order creation', {
        duration,
        operation: 'create_order',
        userId,
        itemCount: items.length,
        paymentAmount: totalPaymentAmount,
        module: 'database',
      })

      // Create a more detailed error for Sentry
      const timeoutError = new Error(`Database timeout after ${duration}ms during order creation`)
      timeoutError.name = 'OrderCreationTimeoutError'
      
      // Add additional context to the error - including all required info
      Sentry.setContext('order_creation_timeout', {
        duration,
        operation: 'create_order',
        userId,
        itemCount: items.length,
        paymentAmount: totalPaymentAmount,
        timestamp: new Date().toISOString(),
      })

      // Set error level and tags
      Sentry.setTag('error_type', 'order_creation_timeout')
      Sentry.setTag('order_status', 'failed')
      Sentry.setTag('timeout_duration', duration.toString())
      Sentry.setTag('user_id', userId)
      Sentry.setTag('payment_amount', totalPaymentAmount.toString())
      
      // Log the error explicitly - including all required info
      logger.error('Order creation timeout error', {
        error: timeoutError.message,
        duration,
        userId,
        itemCount: items.length,
        paymentAmount: totalPaymentAmount,
        module: 'order',
        action: 'timeout_error',
      })
      
      // Capture the exception in Sentry - including all required info
      Sentry.captureException(timeoutError, {
        tags: {
          error_type: 'order_creation_timeout',
          order_status: 'failed',
          timeout_duration: duration.toString(),
          user_id: userId,
          payment_amount: totalPaymentAmount.toString(),
        },
        extra: {
          userId,
          itemCount: items.length,
          paymentAmount: totalPaymentAmount,
          duration,
        },
      })
      
      // Throw the error instead of returning response to ensure proper error tracking
      throw timeoutError
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    // Log order creation failure with Sentry's native logging
    const { logger } = Sentry
    logger.error(logger.fmt`Order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      userId: 'unknown',
      itemCount: 0,
      module: 'order',
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