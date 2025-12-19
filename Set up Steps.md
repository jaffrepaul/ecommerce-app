Set up Steps

## Quick Setup (3 commands)

**1. Create and connect to a free Neon database**

```bash
pnpx neondb -y
```

This automatically creates a Neon database and updates your `.env` file with the connection string.

**2. Set up database schema and seed with sample products**

```bash
npm run db:setup
```

**3. Start the development server**

```bash
npm run dev
```

**4. Open the app**

- Navigate to http://localhost:3000 (or the port shown in terminal)
- You should see the ecommerce store with 7 sample products

---

## Testing the Flow

1. Browse the products on the homepage
2. Click "Add to Cart" on any product
3. Click the "Cart" button to view your items
4. Adjust quantities or remove items
5. Click "Checkout" to place an order
6. Check your Neon database to see the created user and order records
