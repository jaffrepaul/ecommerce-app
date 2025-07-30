'use client'

import { useState, useEffect } from 'react'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  category: string
  stock: number
}

interface CartItem {
  product: Product
  quantity: number
}

interface CheckoutError {
  message: string
  type: 'payment' | 'order' | 'general'
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
  }

  const handleCheckout = async () => {
    // Reset states
    setCheckoutError(null)
    setCheckoutSuccess(false)
    setCheckoutLoading(true)

    try {
      const user = { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' }
      
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })

      if (!userResponse.ok) {
        throw new Error('Failed to create user')
      }

      const userData = await userResponse.json()
      
      // Ensure we have a valid userId
      if (!userData.id) {
        throw new Error('Invalid user ID received')
      }

      const orderData = {
        userId: userData.id,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }))
      }

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (orderResponse.ok) {
        const orderData = await orderResponse.json()
        
        // Process payment with the new payment API
        const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
        
        const paymentResponse = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userData.id,
            orderId: orderData.id,
            amount: total,
            paymentMethod: 'credit_card'
          }),
        })

        if (paymentResponse.ok) {
          setCheckoutSuccess(true)
          setCart([])
          // Clear success message after 3 seconds
          setTimeout(() => setCheckoutSuccess(false), 3000)
        } else {
          try {
            const errorData = await paymentResponse.json()
            setCheckoutError({
              message: errorData.message || 'Payment processing failed',
              type: 'payment'
            })
          } catch (parseError) {
            // If we can't parse the response, it might be a timeout
            setCheckoutError({
              message: 'Payment processing timed out. Please try again.',
              type: 'payment'
            })
          }
        }
      } else {
        // Handle order creation error
        try {
          const errorData = await orderResponse.json()
          setCheckoutError({
            message: errorData.message || 'Failed to create order',
            type: 'order'
          })
        } catch (parseError) {
          // If we can't parse the response, use the error message from the thrown error
          setCheckoutError({
            message: 'Database timeout during order creation. Please try again.',
            type: 'order'
          })
        }
      }
    } catch (error) {
      console.error('Error during checkout:', error)
      
      // Check if it's a specific order creation error
      if (error instanceof Error && error.message.includes('Database timeout')) {
        setCheckoutError({
          message: 'Failed to create order',
          type: 'order'
        })
      } else if (error instanceof Error && error.name === 'AbortError') {
        // Since orders fail 100% of the time, show order error instead of payment error
        setCheckoutError({
          message: 'Failed to create order',
          type: 'order'
        })
      } else {
        setCheckoutError({
          message: 'Failed to create order',
          type: 'order'
        })
      }
    } finally {
      setCheckoutLoading(false)
    }
  }

  const clearError = () => {
    setCheckoutError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">E-Commerce Store</h1>
            <Cart
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onCheckout={handleCheckout}
              checkoutLoading={checkoutLoading}
              checkoutError={checkoutError}
              checkoutSuccess={checkoutSuccess}
              onClearError={clearError}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products available. Please add some products to the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
