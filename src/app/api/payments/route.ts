import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      name: 'Process Payment',
      op: 'payment',
    },
    async (span) => {
      try {
        // Get authenticated user and set scope attributes first
        const authenticatedUser = await getCurrentUser()
        if (authenticatedUser) {
          Sentry.setUser({
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            username: authenticatedUser.name,
          })
          
          // Set companyId on isolation scope (request-level) - automatically added to all logs, spans, and errors
          // Using getIsolationScope() instead of getCurrentScope() as per Sentry 10.32.0 scope hierarchy
          Sentry.getIsolationScope().setAttributes({ 
            companyId: authenticatedUser.companyId 
          })
          
          console.log(`✅ [API Route - Payment] Sentry scope attributes set: companyId=${authenticatedUser.companyId}`)
        }
        
        const body = await request.json()
        const { userId, orderId, amount, paymentMethod } = body

        // Add custom context
        Sentry.setContext('payment', {
          orderId,
          amount,
          paymentMethod,
          timestamp: new Date().toISOString(),
        })

        // Capture start time before any delays
        const startTime = Date.now()

        // Get previous successful transactions for context
        const previousTransactions = await prisma.order.findMany({
          where: {
            userId,
            status: 'CONFIRMED'
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' }
        })

        // Log successful payment processing with Sentry
        const { logger } = Sentry
        
        logger.info(logger.fmt`Payment processed successfully for order ${updatedOrder.id}`, {
          userId,
          orderId: updatedOrder.id,
          paymentAmount: amount,
          paymentMethod,
          orderStatus: updatedOrder.status,
          previousTransactionsCount: previousTransactions.length,
          module: 'payment',
          action: 'process_success',
        })
        
        // Set success tags for Sentry
        Sentry.setTag('payment_status', 'success')
        Sentry.setTag('user_id', userId)
        Sentry.setTag('order_id', updatedOrder.id)
        Sentry.setTag('payment_amount', amount.toString())
        Sentry.setTag('previous_transactions', previousTransactions.length.toString())

        // Add success context to Sentry
        Sentry.setContext('payment_success', {
          userId,
          orderId: updatedOrder.id,
          paymentAmount: amount,
          paymentMethod,
          orderStatus: updatedOrder.status,
          previousTransactionsCount: previousTransactions.length,
          timestamp: new Date().toISOString(),
        })

        // Simulate database timeout 100% of the time for demo
        const shouldTimeout = true // 100% chance for demo - ensures errors occur every time
        
        if (shouldTimeout) {
          // Add breadcrumb for timeout simulation start
          Sentry.addBreadcrumb({
            category: 'payment',
            message: 'Starting payment gateway timeout simulation',
            level: 'info',
            data: {
              userId,
              orderId: updatedOrder.id,
              paymentAmount: amount,
            },
          })

          // Create a CUSTOM SPAN for the slow payment gateway query
          await Sentry.startSpan(
            {
              name: 'Payment Gateway Query - Transaction History',
              op: 'payment.gateway',
            },
            async () => {
              // Set tags for searchability in Sentry
              Sentry.setTag('user_id', userId)
              Sentry.setTag('order_id', updatedOrder.id)
              Sentry.setTag('payment_amount', amount.toString())
              Sentry.setTag('operation', 'fetch_transaction_history')
              Sentry.setTag('query_type', 'gateway_timeout')
              Sentry.setTag('module', 'payment')
              
              // Use setTimeout to simulate a slow payment gateway query
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          )
          
          // Add breadcrumb for slow query completion
          Sentry.addBreadcrumb({
            category: 'payment',
            message: 'Slow payment gateway query completed',
            level: 'info',
            data: {
              operation: 'fetch_transaction_history',
              duration: 300,
            },
          })
          
          const duration = Date.now() - startTime
          
          // Log timeout with Sentry's native logging
          logger.error('Payment gateway timeout occurred during payment processing', {
            duration,
            operation: 'process_payment',
            userId,
            orderId: updatedOrder.id,
            paymentAmount: amount,
            module: 'payment',
          })

          // Create a more detailed error for Sentry
          const timeoutError = new Error(`Payment gateway timeout after ${duration}ms during payment processing`)
          timeoutError.name = 'PaymentGatewayTimeoutError'
          
          // Add additional context to the error
          Sentry.setContext('payment_gateway_timeout', {
            duration,
            operation: 'process_payment',
            userId,
            orderId: updatedOrder.id,
            paymentAmount: amount,
            paymentMethod,
            timestamp: new Date().toISOString(),
          })

          // Set error level and tags
          Sentry.setTag('error_type', 'payment_gateway_timeout')
          Sentry.setTag('payment_status', 'failed')
          Sentry.setTag('timeout_duration', duration.toString())
          Sentry.setTag('user_id', userId)
          Sentry.setTag('payment_amount', amount.toString())
          
          // Log the error explicitly
          logger.error('Payment gateway timeout error', {
            error: timeoutError.message,
            duration,
            userId,
            orderId: updatedOrder.id,
            paymentAmount: amount,
            module: 'payment',
            action: 'timeout_error',
          })
          
          // Capture the exception in Sentry
          Sentry.captureException(timeoutError, {
            tags: {
              error_type: 'payment_gateway_timeout',
              payment_status: 'failed',
              timeout_duration: duration.toString(),
              user_id: userId,
              payment_amount: amount.toString(),
            },
            extra: {
              userId,
              orderId: updatedOrder.id,
              paymentAmount: amount,
              paymentMethod,
              duration,
            },
          })
          
          // Throw the error instead of returning response to ensure proper error tracking
          throw timeoutError
        }

        return NextResponse.json({
          success: true,
          orderId: updatedOrder.id,
          status: updatedOrder.status,
        })

      } catch (error) {
        // Try to get the request body, but don't fail if it's already been consumed
        let body: { userId?: string; orderId?: string; amount?: number } = {}
        try {
          // Clone the request to avoid consuming it twice
          const clonedRequest = request.clone()
          body = await clonedRequest.json()
        } catch (parseError) {
          // If we can't parse the body, use empty object
          body = {}
        }
        
        // Set user context for error logging
        Sentry.setUser({
          id: body?.userId || 'unknown',
        })

        // Try to fetch previous successful transactions for context
        let previousTransactionsCount = 0
        try {
          if (body?.userId) {
            const previousTransactions = await prisma.order.findMany({
              where: {
                userId: body.userId,
                status: 'CONFIRMED'
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            })
            previousTransactionsCount = previousTransactions.length
          }
        } catch (fetchError) {
          console.error('Failed to fetch previous transactions:', fetchError)
        }

        // Log payment failure with Sentry captureMessage
        Sentry.captureMessage(Sentry.logger.fmt`Payment failed for order ${body?.orderId || 'unknown'}`, {
          level: 'error',
          tags: {
            user_id: body?.userId || 'unknown',
            order_id: body?.orderId || 'unknown',
            payment_amount: (body?.amount || 0).toString(),
            previous_transactions: previousTransactionsCount.toString(),
            module: 'payment',
            action: 'failure',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_name: error instanceof Error ? error.name : 'UnknownError',
          },
          extra: {
            userId: body?.userId || 'unknown',
            orderId: body?.orderId || 'unknown',
            paymentAmount: body?.amount || 0,
            previousTransactionsCount,
            module: 'payment',
            action: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorName: error instanceof Error ? error.name : 'UnknownError',
            user_id: body?.userId || 'unknown',
            payment_amount: body?.amount || 0,
            previous_transactions: previousTransactionsCount,
            order_id: body?.orderId || 'unknown',
          },
        })

        // Capture the exception
        if (error instanceof Error) {
          Sentry.captureException(error, {
            tags: {
              module: 'payment',
              action: 'failure',
              user_id: body?.userId || 'unknown',
              payment_amount: (body?.amount || 0).toString(),
              previous_transactions: previousTransactionsCount.toString(),
            },
            extra: {
              userId: body?.userId || 'unknown',
              orderId: body?.orderId || 'unknown',
              paymentAmount: body?.amount || 0,
              previousTransactionsCount,
            },
          })
        }

        // Add error context to Sentry
        if (error instanceof Error) {
          Sentry.setContext('payment_error', {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            userId: body?.userId || 'unknown',
            orderId: body?.orderId || 'unknown',
            amount: body?.amount || 0,
            previousTransactionsCount,
          })
        }

        return NextResponse.json(
          { 
            error: 'Payment processing failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }
  )
}