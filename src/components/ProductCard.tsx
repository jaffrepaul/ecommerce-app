'use client'

import { useState } from 'react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  category: string
  stock: number
}

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success'>('idle')

  const handleAddToCart = async () => {
    if (buttonState !== 'idle') return
    
    setButtonState('loading')
    
    // Simulate a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500))
    
    onAddToCart(product)
    setButtonState('success')
    
    // Reset to idle after showing success state
    setTimeout(() => setButtonState('idle'), 1500)
  }

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Adding...
          </>
        )
      case 'success':
        return (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Added!
          </>
        )
      default:
        return product.stock === 0 ? 'Out of Stock' : 'Add to Cart'
    }
  }

  const getButtonClasses = () => {
    const baseClasses = "w-full mt-3 py-2 px-4 rounded-md flex items-center justify-center transition-all duration-200"
    
    if (product.stock === 0) {
      return `${baseClasses} bg-gray-400 text-gray-600 cursor-not-allowed`
    }
    
    switch (buttonState) {
      case 'loading':
        return `${baseClasses} bg-blue-500 text-white cursor-not-allowed`
      case 'success':
        return `${baseClasses} bg-green-600 text-white cursor-not-allowed`
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95`
    }
  }

  return (
    console.log('ProductCard rendered'),
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-500 mb-2">{product.category}</p>
          {product.description && (
            <p className="text-gray-700 text-sm mb-3">{product.description}</p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-green-600">
              ${product.price}
            </span>
            <span className="text-sm text-gray-500">
              Stock: {product.stock}
            </span>
          </div>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || buttonState !== 'idle'}
          className={getButtonClasses()}
        >
          {getButtonContent()}
        </button>
      </div>
    </div>
  )
}