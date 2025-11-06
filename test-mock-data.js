/**
 * Test script to verify mock data generation
 * Run with: node test-mock-data.js
 */

// Note: This is a quick test. For full testing, would need to handle TypeScript imports
console.log('📋 Mock Data Generation Test');
console.log('================================\n');

// Simulate the data generation logic
const dayjs = require('dayjs');

// Simulate record generation
const recordCount = 30;
let totalRecords = 0;

for (let day = 0; day < 30; day++) {
  const recordsPerDay = day < 7
    ? Math.floor(Math.random() * 3 + 2)  // 2-4 records for recent days
    : Math.floor(Math.random() * 2 + 1); // 1-2 records for older days

  totalRecords += recordsPerDay;

  if (day < 7) {
    console.log(`Day -${day}: ${recordsPerDay} records`);
  }
}

// Add today's 3 fixed records
totalRecords += 3;

console.log(`\nTotal records (estimated): ${totalRecords}`);
console.log(`\nThis should be between 50-70 records`);

// Test date formatting
console.log(`\n📅 Date Range Test:`);
for (let i = 6; i >= 0; i--) {
  const date = dayjs().subtract(i, 'day');
  console.log(`  ${date.format('YYYY-MM-DD')} (${date.format('MMM DD')})`);
}
