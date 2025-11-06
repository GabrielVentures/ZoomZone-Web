/**
 * Enriched Mock Data for Development
 * 50+ records across 30 days for meaningful Dashboard charts
 */

import { ScanRecord } from '@/types';
import dayjs from 'dayjs';

/**
 * Generate a mock scan record
 */
const generateMockRecord = (
  id: string,
  daysAgo: number,
  user: { username: string; userId: string },
  merchant: string,
  product: { title: string; price: string; category: string; brand: string },
  status: 'completed' | 'pending' | 'failed',
  confidence?: number
): ScanRecord => {
  const timestamp = dayjs().subtract(daysAgo, 'day').hour(9 + Math.floor(Math.random() * 10)).minute(Math.floor(Math.random() * 60)).toDate();
  const uploadTimestamp = dayjs(timestamp).add(1, 'minute').toDate();

  const baseRecord: ScanRecord = {
    id,
    username: user.username,
    userId: user.userId,
    timestamp,
    uploadTimestamp,
    merchant,
    barcode: `${Math.floor(Math.random() * 900000000000 + 100000000000)}`,
    latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
    longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
    storeLocation: `${merchant} Store`,
    imageFilename: `${merchant.toLowerCase()}_${product.title.toLowerCase().replace(/ /g, '_')}_${id}.jpg`,
    imageUrl: `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.title)}`,
    aiProcessed: status === 'completed',
    aiError: status === 'failed' ? 'Image quality too low - barcode area is blurry' : undefined,
  };

  if (status === 'completed') {
    const conf = confidence || 0.75 + Math.random() * 0.2;
    baseRecord.aiResult = {
      title: product.title,
      price: product.price,
      category: product.category,
      brand: product.brand,
      size: Math.random() > 0.5 ? `${Math.floor(Math.random() * 5 + 1)} lbs` : `${Math.floor(Math.random() * 32 + 8)} oz`,
      description: `High quality ${product.title}`,
      confidence: conf,
      processedAt: dayjs(uploadTimestamp).add(30, 'second').toDate(),
      metadata: { source: 'gpt-4o', version: '2024-11' },
    };

    const tokens = Math.floor(800 + Math.random() * 800);
    baseRecord.aiCost = {
      totalCostUsd: tokens * 0.0000035,
      inputTokens: Math.floor(tokens * 0.9),
      outputTokens: Math.floor(tokens * 0.1),
      totalTokens: tokens,
      processingTimeMs: Math.floor(1500 + Math.random() * 2000),
      model: 'gpt-4o',
    };
  }

  return baseRecord;
};

// User profiles
const users = [
  { username: 'john_doe', userId: 'user-001' },
  { username: 'jane_smith', userId: 'user-002' },
  { username: 'bob_wilson', userId: 'user-003' },
  { username: 'alice_johnson', userId: 'user-004' },
  { username: 'charlie_brown', userId: 'user-005' },
];

// Merchants
const merchants = ['Walmart', 'Target', 'Costco', 'Whole Foods', 'Trader Joes', 'Safeway'];

// Product catalog
const products = [
  { title: 'Organic Bananas', price: '$2.99', category: 'Fresh Produce', brand: 'Great Value' },
  { title: 'Whole Milk', price: '$4.99', category: 'Dairy', brand: 'Horizon Organic' },
  { title: 'Greek Yogurt', price: '$5.49', category: 'Dairy', brand: 'Chobani' },
  { title: 'Sourdough Bread', price: '$3.99', category: 'Bakery', brand: 'Boudin' },
  { title: 'Organic Eggs', price: '$6.99', category: 'Dairy', brand: 'Happy Egg Co' },
  { title: 'Almond Butter', price: '$9.99', category: 'Spreads', brand: 'Justins' },
  { title: 'Avocados', price: '$3.99', category: 'Fresh Produce', brand: 'Organic' },
  { title: 'Chicken Breast', price: '$12.99', category: 'Meat', brand: 'Kirkland' },
  { title: 'Salmon Fillet', price: '$18.99', category: 'Seafood', brand: 'Wild Alaskan' },
  { title: 'Orange Juice', price: '$4.49', category: 'Beverages', brand: 'Tropicana' },
  { title: 'Cheddar Cheese', price: '$7.99', category: 'Dairy', brand: 'Tillamook' },
  { title: 'Pasta', price: '$2.49', category: 'Pantry', brand: 'Barilla' },
  { title: 'Tomato Sauce', price: '$3.49', category: 'Pantry', brand: 'Rao\'s' },
  { title: 'Olive Oil', price: '$15.99', category: 'Cooking', brand: 'California Olive Ranch' },
  { title: 'Quinoa', price: '$8.99', category: 'Grains', brand: 'Bob\'s Red Mill' },
  { title: 'Granola', price: '$5.99', category: 'Breakfast', brand: 'Nature Valley' },
  { title: 'Peanut Butter', price: '$4.99', category: 'Spreads', brand: 'Skippy' },
  { title: 'Coffee Beans', price: '$12.99', category: 'Beverages', brand: 'Starbucks' },
  { title: 'Green Tea', price: '$6.49', category: 'Beverages', brand: 'Bigelow' },
  { title: 'Honey', price: '$9.99', category: 'Sweeteners', brand: 'Local Hive' },
];

/**
 * Generate 60 mock records across 30 days
 */
export const enrichedMockScanRecords: ScanRecord[] = [];

let recordId = 1;

// Past 30 days with varying activity levels
for (let day = 0; day < 30; day++) {
  // More records on recent days, fewer on older days
  const recordsPerDay = day < 7 ? Math.floor(Math.random() * 3 + 2) : Math.floor(Math.random() * 2 + 1);

  for (let i = 0; i < recordsPerDay; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const product = products[Math.floor(Math.random() * products.length)];

    // 80% completed, 15% pending, 5% failed
    const rand = Math.random();
    const status = rand < 0.8 ? 'completed' : rand < 0.95 ? 'pending' : 'failed';

    // Higher confidence for recent records
    const confidence = day < 7 ? 0.85 + Math.random() * 0.12 : 0.75 + Math.random() * 0.20;

    enrichedMockScanRecords.push(
      generateMockRecord(
        `scan-${String(recordId).padStart(3, '0')}`,
        day,
        user,
        merchant,
        product,
        status,
        confidence
      )
    );

    recordId++;
  }
}

// Ensure we have at least a few records for today
const today = [
  generateMockRecord(
    `scan-${String(recordId++).padStart(3, '0')}`,
    0,
    users[0],
    'Walmart',
    products[0],
    'completed',
    0.95
  ),
  generateMockRecord(
    `scan-${String(recordId++).padStart(3, '0')}`,
    0,
    users[1],
    'Target',
    products[1],
    'completed',
    0.92
  ),
  generateMockRecord(
    `scan-${String(recordId++).padStart(3, '0')}`,
    0,
    users[0],
    'Costco',
    products[2],
    'pending'
  ),
];

enrichedMockScanRecords.push(...today);

// Sort by timestamp descending (newest first)
enrichedMockScanRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

console.log(`✅ Generated ${enrichedMockScanRecords.length} mock scan records`);
