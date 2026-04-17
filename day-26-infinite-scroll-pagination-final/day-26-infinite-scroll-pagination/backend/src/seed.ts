// src/seed.ts
// Populates the database with sample product data for development/testing.
// Run with: npm run seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Sports', 'Home & Garden', 'Toys'];

const ADJECTIVES = ['Premium', 'Classic', 'Pro', 'Ultra', 'Essential', 'Advanced', 'Smart'];
const NOUNS = ['Widget', 'Gadget', 'Device', 'Tool', 'Kit', 'Set', 'Bundle', 'Pack'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.product.deleteMany();

  // Generate 200 products for testing infinite scroll
  const products = Array.from({ length: 200 }, (_, i) => ({
    name: `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)} ${i + 1}`,
    description: `High-quality ${randomItem(NOUNS).toLowerCase()} perfect for everyday use. Features include durability, reliability, and excellent value for money.`,
    price: randomFloat(9.99, 999.99),
    category: randomItem(CATEGORIES),
    // Using picsum.photos for placeholder images (deterministic by ID)
    imageUrl: `https://picsum.photos/seed/${i + 1}/400/300`,
    stock: Math.floor(Math.random() * 100),
    rating: randomFloat(1, 5),
    reviewCount: Math.floor(Math.random() * 1000),
    // Spread createdAt over past 6 months for realistic pagination testing
    createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
  }));

  await prisma.product.createMany({ data: products });

  console.log(`✅ Created ${products.length} products`);
  console.log('Categories:', CATEGORIES.join(', '));
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
