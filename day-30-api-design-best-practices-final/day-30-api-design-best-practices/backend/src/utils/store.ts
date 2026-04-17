// src/utils/store.ts
// In-memory product store with pagination support.
// Simulates a real database layer — swap with Prisma/Mongoose in production.

import { randomUUID } from 'crypto';
import { Product, CreateProductDto, UpdateProductDto } from '../types/index.js';

const now = () => new Date().toISOString();

// Seed data — 25 products across categories
const seed: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Wireless Headphones Pro', description: 'Premium noise-cancelling over-ear headphones with 30hr battery life', price: 299.99, category: 'Electronics', stock: 45, sku: 'ELEC-WHP-001' },
  { name: 'Mechanical Keyboard TKL', description: 'Tenkeyless mechanical keyboard with Cherry MX Red switches and RGB backlighting', price: 129.99, category: 'Electronics', stock: 30, sku: 'ELEC-KBD-002' },
  { name: 'USB-C Hub 7-in-1', description: 'Compact USB-C hub with HDMI, USB-A ports, SD card reader and 100W PD charging', price: 49.99, category: 'Electronics', stock: 100, sku: 'ELEC-HUB-003' },
  { name: 'Clean Code', description: 'A handbook of agile software craftsmanship by Robert C. Martin', price: 39.99, category: 'Books', stock: 200, sku: 'BOOK-CC-001' },
  { name: 'The Pragmatic Programmer', description: 'Your journey to mastery, 20th anniversary edition', price: 49.99, category: 'Books', stock: 150, sku: 'BOOK-PP-002' },
  { name: 'System Design Interview Vol 2', description: "An insider's guide to system design questions", price: 35.99, category: 'Books', stock: 90, sku: 'BOOK-SDI-003' },
  { name: 'Yoga Mat Premium 6mm', description: 'Non-slip TPE yoga mat with alignment lines and carry strap', price: 39.99, category: 'Sports', stock: 60, sku: 'SPRT-YM-001' },
  { name: 'Resistance Bands Set', description: 'Set of 5 heavy-duty latex resistance bands from 10 to 50lbs', price: 24.99, category: 'Sports', stock: 80, sku: 'SPRT-RBS-002' },
  { name: 'Running Water Belt', description: 'Hands-free hydration running belt with two 10oz bottles and phone pocket', price: 29.99, category: 'Sports', stock: 55, sku: 'SPRT-WB-003' },
  { name: 'Cast Iron Skillet 12"', description: 'Pre-seasoned Lodge cast iron skillet, oven safe to 500°F', price: 39.99, category: 'Home', stock: 40, sku: 'HOME-CIS-001' },
  { name: 'Smart LED Starter Kit', description: 'Smart LED bulbs with bridge, works with Alexa and Google Home', price: 149.99, category: 'Home', stock: 25, sku: 'HOME-LED-002' },
  { name: 'Pour-Over Coffee Set', description: 'Complete pour-over coffee set with gooseneck kettle and stand', price: 89.99, category: 'Home', stock: 35, sku: 'HOME-COF-003' },
  { name: 'Merino Wool Base Layer', description: 'Temperature-regulating merino wool base layer top, odour-resistant', price: 89.99, category: 'Clothing', stock: 50, sku: 'CLTH-MWB-001' },
  { name: 'Trail Running Shoes', description: 'Lightweight trail running shoes with aggressive grip sole', price: 119.99, category: 'Clothing', stock: 40, sku: 'CLTH-TRS-002' },
  { name: 'Waterproof Jacket', description: '3-layer Gore-Tex waterproof jacket, packable, 10k waterproof rating', price: 199.99, category: 'Clothing', stock: 30, sku: 'CLTH-WJ-003' },
  { name: 'DeWalt Drill Driver Kit', description: '20V MAX brushless drill driver with 2 batteries and fast charger', price: 159.99, category: 'Tools', stock: 20, sku: 'TOOL-DD-001' },
  { name: 'Leatherman Wave+ Multi-tool', description: '18-in-1 stainless steel multi-tool with nylon sheath', price: 109.99, category: 'Tools', stock: 45, sku: 'TOOL-LW-002' },
  { name: 'Tape Measure 25ft', description: 'Stanley FatMax tape measure with wide blade and magnetic tip', price: 19.99, category: 'Tools', stock: 90, sku: 'TOOL-TM-003' },
  { name: 'PS5 DualSense Controller', description: 'PlayStation 5 wireless controller with haptic feedback and adaptive triggers', price: 69.99, category: 'Gaming', stock: 35, sku: 'GAME-DS5-001' },
  { name: 'Gaming Headset 7.1', description: 'Surround sound gaming headset with noise-cancelling microphone', price: 79.99, category: 'Gaming', stock: 45, sku: 'GAME-GH-002' },
  { name: 'Stream Deck MK2', description: '15-key customisable LCD controller for streaming and productivity', price: 149.99, category: 'Gaming', stock: 20, sku: 'GAME-SD-003' },
  { name: 'Ergonomic Keyboard Split', description: 'Split ergonomic keyboard with tenting and palm rests', price: 179.99, category: 'Office', stock: 15, sku: 'OFFC-EK-001' },
  { name: 'Monitor Arm Dual', description: 'Dual monitor arm with full motion, fits monitors up to 32"', price: 89.99, category: 'Office', stock: 25, sku: 'OFFC-MA-002' },
  { name: 'USB Condenser Microphone', description: 'Professional USB condenser mic with cardioid polar pattern', price: 129.99, category: 'Office', stock: 30, sku: 'OFFC-MIC-003' },
  { name: 'Laptop Stand Aluminium', description: 'Adjustable aluminium laptop stand with 6 height settings', price: 49.99, category: 'Office', stock: 60, sku: 'OFFC-LS-004' },
];

// Initialise store with seeded data
const store = new Map<string, Product>(
  seed.map(p => {
    const id = randomUUID();
    const ts = now();
    const product: Product = { ...p, id, createdAt: ts, updatedAt: ts };
    return [id, product];
  })
);

// ── CRUD operations ───────────────────────────────────────────────────────

export interface ListOptions {
  page: number;
  pageSize: number;
  category?: string;
  search?: string;
  sort: string;
  order: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export const ProductStore = {
  list(opts: ListOptions): PagedResult<Product> {
    let items = Array.from(store.values());

    // Filter
    if (opts.category) items = items.filter(p => p.category === opts.category);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    if (opts.minPrice !== undefined) items = items.filter(p => p.price >= opts.minPrice!);
    if (opts.maxPrice !== undefined) items = items.filter(p => p.price <= opts.maxPrice!);

    // Sort
    items.sort((a, b) => {
      const aVal = a[opts.sort as keyof Product] as string | number;
      const bVal = b[opts.sort as keyof Product] as string | number;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return opts.order === 'asc' ? cmp : -cmp;
    });

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / opts.pageSize));
    const start = (opts.page - 1) * opts.pageSize;
    const paged = items.slice(start, start + opts.pageSize);

    return { items: paged, totalItems, totalPages, page: opts.page, pageSize: opts.pageSize };
  },

  findById(id: string): Product | undefined {
    return store.get(id);
  },

  findBySku(sku: string): Product | undefined {
    return Array.from(store.values()).find(p => p.sku === sku);
  },

  create(dto: CreateProductDto): Product {
    const id = randomUUID();
    const ts = now();
    const product: Product = { ...dto, id, createdAt: ts, updatedAt: ts };
    store.set(id, product);
    return product;
  },

  update(id: string, dto: UpdateProductDto): Product | null {
    const existing = store.get(id);
    if (!existing) return null;
    const updated: Product = { ...existing, ...dto, updatedAt: now() };
    store.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return store.delete(id);
  },
};
