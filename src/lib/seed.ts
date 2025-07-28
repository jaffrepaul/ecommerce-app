import { prisma } from './prisma'

async function main() {
  console.log('Start seeding...')

  await prisma.product.createMany({
    data: [
      {
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 199.99,
        category: 'Electronics',
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'
      },
      {
        name: 'Coffee Mug',
        description: 'Ceramic coffee mug with ergonomic handle',
        price: 12.99,
        category: 'Home & Kitchen',
        stock: 100,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500'
      },
      {
        name: 'Running Shoes',
        description: 'Lightweight running shoes for all terrains',
        price: 89.99,
        category: 'Sports',
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'
      },
      {
        name: 'Laptop Stand',
        description: 'Adjustable aluminum laptop stand for better ergonomics',
        price: 45.99,
        category: 'Office',
        stock: 30,
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500'
      },
      {
        name: 'Water Bottle',
        description: 'Stainless steel insulated water bottle',
        price: 24.99,
        category: 'Sports',
        stock: 75,
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500'
      }
    ]
  })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })