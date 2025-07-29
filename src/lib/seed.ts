import { prisma } from './prisma'

async function main() {
  console.log('Start seeding...')

  // Clear existing products to avoid duplicates
  await prisma.product.deleteMany({})

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
        imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500'
      },
      {
        name: 'Water Bottle',
        description: 'Stainless steel insulated water bottle',
        price: 24.99,
        category: 'Sports',
        stock: 75,
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500'
      },
      {
        name: 'Smart Watch',
        description: 'Fitness tracking smartwatch with heart rate monitor',
        price: 299.99,
        category: 'Electronics',
        stock: 20,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
      },
      {
        name: 'Yoga Mat',
        description: 'Non-slip yoga mat perfect for home workouts',
        price: 34.99,
        category: 'Sports',
        stock: 40,
        imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500'
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