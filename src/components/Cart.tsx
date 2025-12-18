'use client'

import { useState } from 'react'

interface Product {
  id: string
  name: string
  price: number
}

interface CartItem {
  product: Product
  quantity: number
}

interface CheckoutError {
  message: string
  type: 'payment' | 'order' | 'general'
}

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onCheckout: () => void
  checkoutLoading?: boolean
  checkoutError?: CheckoutError | null
  checkoutSuccess?: boolean
  onClearError?: () => void
}

export default function Cart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  checkoutLoading = false,
  checkoutError = null,
  checkoutSuccess = false,
  onClearError
}: CartProps) {
  const [isOpen, setIsOpen] = useState(false)

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      case 'order':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    console.log('Cart rendered'),
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Cart ({items.length})
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Shopping Cart</h3>
            
            {/* Error Message */}
            {checkoutError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-red-400">
                    {getErrorIcon(checkoutError.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-red-800">
                      {checkoutError.type === 'payment' ? 'Payment Error' : 
                       checkoutError.type === 'order' ? 'Order Error' : 'Error'}
                    </h4>
                    <p className="text-sm text-red-700 mt-1">{checkoutError.message}</p>
                  </div>
                  {onClearError && (
                    <button
                      onClick={onClearError}
                      className="ml-2 text-red-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success Message */}
            {checkoutSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">Order Successful!</h4>
                    <p className="text-sm text-green-700 mt-1">Your order has been placed and payment processed successfully.</p>
                  </div>
                </div>
              </div>
            )}
            
            {items.length === 0 ? (
              <p className="text-gray-700">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                        <p className="text-sm text-gray-700">${item.product.price}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-semibold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded border border-gray-300">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-semibold"
                        >
                          +
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-900">Total: ${total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={onCheckout}
                    disabled={checkoutLoading}
                    className={`w-full py-2 px-4 rounded-md transition-colors ${
                      checkoutLoading
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {checkoutLoading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      'Checkout'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}