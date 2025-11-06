/**
 * Test Budget Management Alert System
 *
 * This script creates test scan records with configurable AI costs
 * to verify that budget alerts are triggered correctly.
 *
 * Usage:
 *   # Test daily budget warning (80% = $0.80)
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs daily warning
 *
 *   # Test weekly budget critical (90% = $4.50)
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs weekly critical
 *
 *   # Test monthly budget exceeded (100% = $20.00)
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs monthly exceeded
 *
 *   # Clean up all test records
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs cleanup
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.GCLOUD_PROJECT || 'zoom-zone-6619c';
  admin.initializeApp({
    projectId,
  });
}

const firestore = admin.firestore();

// Default budget configuration (must match DEFAULT_BUDGET_CONFIG in budgetUtils.ts)
const DEFAULT_BUDGETS = {
  daily: 1.0,     // $1.00 per day
  weekly: 5.0,    // $5.00 per week
  monthly: 20.0,  // $20.00 per month
};

const ALERT_THRESHOLDS = {
  warning: 0.80,   // 80%
  critical: 0.90,  // 90%
  exceeded: 1.00,  // 100%
};

// Test record marker to identify and clean up test data
const TEST_MARKER = '[TEST-BUDGET]';

/**
 * Create test scan records with specified total cost
 */
async function createTestRecords(totalCost, recordCount = 1, userId = null) {
  const costPerRecord = totalCost / recordCount;
  const timestamp = admin.firestore.Timestamp.now();
  const records = [];

  // If no userId provided, try to get current user from environment or use test ID
  const finalUserId = userId || process.env.TEST_USER_ID || 'test-budget-user-id';

  console.log(`\n📝 Creating ${recordCount} test record(s) with total cost: $${totalCost.toFixed(4)}`);
  console.log(`   Cost per record: $${costPerRecord.toFixed(4)}`);
  console.log(`   User ID: ${finalUserId}`);

  for (let i = 0; i < recordCount; i++) {
    const record = {
      // Required fields - Use PascalCase to match real records!
      Username: `${TEST_MARKER} Test User ${i + 1}`,
      User_ID: finalUserId,
      Timestamp: timestamp,
      Merchant: `${TEST_MARKER} Walmart`,
      Barcode: `TEST${Date.now()}${i}`,
      Image_Filename: `test-image-${i}.jpg`,
      Image_URL: 'https://example.com/test-image.jpg',
      Scan_ID: `TEST-${Date.now()}-${i}`,
      Store_Location: 'Test Store',

      // AI processing fields
      ai_processed: true,
      ai_status: 'completed',

      // AI cost tracking - THIS IS THE KEY FIELD FOR BUDGET MONITORING
      ai_cost: {
        total_cost_usd: costPerRecord,
        pricing_model: 'gpt-4o',
        currency: 'USD',
        input_cost_usd: costPerRecord * 0.9,
        output_cost_usd: costPerRecord * 0.1,
      },

      // AI tokens
      ai_tokens: {
        input: 1000,
        output: 500,
        total: 1500,
      },

      // AI result fields (both lowercase and uppercase for compatibility)
      ai_result: {
        product_name: 'Test Product',
        price: '$9.99',
        confidence: 'high',
      },

      AI_Result: {
        product_name: 'Test Product',
        price: '$9.99',
        confidence: 'high',
        processed_at: timestamp,
      },
    };

    // Add record to Firestore
    const docRef = await firestore.collection('scan_records').add(record);
    records.push({ id: docRef.id, ...record });
    console.log(`   ✅ Created record ${i + 1}/${recordCount} (ID: ${docRef.id})`);
  }

  return records;
}

/**
 * Calculate target cost based on period and alert level
 */
function calculateTargetCost(period, alertLevel) {
  const budget = DEFAULT_BUDGETS[period];
  const threshold = ALERT_THRESHOLDS[alertLevel];

  if (!budget) {
    throw new Error(`Invalid period: ${period}. Use: daily, weekly, or monthly`);
  }

  if (!threshold) {
    throw new Error(`Invalid alert level: ${alertLevel}. Use: warning, critical, or exceeded`);
  }

  return budget * threshold;
}

/**
 * Test budget alert system
 */
async function testBudgetAlert(period, alertLevel, userId = null) {
  console.log('\n🧪 ============================================');
  console.log(`   Budget Alert Test: ${period.toUpperCase()} ${alertLevel.toUpperCase()}`);
  console.log('   ============================================\n');

  const targetCost = calculateTargetCost(period, alertLevel);
  const budget = DEFAULT_BUDGETS[period];
  const percentage = (targetCost / budget) * 100;

  console.log(`📊 Budget Details:`);
  console.log(`   Period: ${period}`);
  console.log(`   Budget Limit: $${budget.toFixed(2)}`);
  console.log(`   Alert Level: ${alertLevel} (${percentage}%)`);
  console.log(`   Target Cost: $${targetCost.toFixed(4)}`);

  // Create test records
  // For exceeded level, add a bit more to ensure we're clearly over budget
  const actualCost = alertLevel === 'exceeded' ? targetCost + 0.10 : targetCost;
  const recordCount = 3; // Create 3 records to simulate realistic usage

  await createTestRecords(actualCost, recordCount, userId);

  console.log('\n✅ Test records created successfully!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Open WebAdmin: http://localhost:3000/budget');
  console.log('   2. Click "Refresh" button to reload data');
  console.log(`   3. Check ${period.charAt(0).toUpperCase() + period.slice(1)} Budget card`);
  console.log(`   4. Expected alert: ${alertLevel.toUpperCase()} - ${getAlertDescription(alertLevel)}`);
  console.log('\n   To clean up test data, run:');
  console.log(`   GCLOUD_PROJECT=${process.env.GCLOUD_PROJECT || 'zoom-zone-6619c'} node scripts/test-budget-alerts.cjs cleanup`);
  console.log('\n');
}

/**
 * Get alert description
 */
function getAlertDescription(alertLevel) {
  switch (alertLevel) {
    case 'warning':
      return 'Yellow/Orange progress bar, "Budget Warning" tag';
    case 'critical':
      return 'Deep orange progress bar, "Budget Critical" tag';
    case 'exceeded':
      return 'Red progress bar, "Budget Exceeded" tag, alert banner at top';
    default:
      return '';
  }
}

/**
 * Clean up all test records
 */
async function cleanupTestRecords() {
  console.log('\n🧹 Cleaning up test records...\n');

  const snapshot = await firestore
    .collection('scan_records')
    .where('username', '>=', TEST_MARKER)
    .where('username', '<=', TEST_MARKER + '\uf8ff')
    .get();

  if (snapshot.empty) {
    console.log('✅ No test records found. Database is clean.\n');
    return;
  }

  console.log(`Found ${snapshot.size} test record(s) to delete:\n`);

  const batch = firestore.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`   🗑️  Deleting: ${doc.id} (${data.username})`);
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();

  console.log(`\n✅ Successfully deleted ${count} test record(s).\n`);
}

/**
 * Display usage help
 */
function showHelp() {
  console.log(`
🧪 Budget Alert Test Script
============================

This script helps you test the Budget Management alert system by creating
scan records with configurable AI costs.

Usage:
  GCLOUD_PROJECT=<project-id> node scripts/test-budget-alerts.cjs <period> <alert-level>

Parameters:
  period       : daily, weekly, or monthly
  alert-level  : warning (80%), critical (90%), or exceeded (100%)

Examples:
  # Test daily budget warning ($0.80 / $1.00 = 80%)
  GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs daily warning

  # Test weekly budget critical ($4.50 / $5.00 = 90%)
  GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs weekly critical

  # Test monthly budget exceeded ($20.00+ / $20.00 = 100%+)
  GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs monthly exceeded

  # Clean up test records
  GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs cleanup

Budget Configuration (from budgetUtils.ts):
  Daily Budget:   $1.00
  Weekly Budget:  $5.00
  Monthly Budget: $20.00

Alert Thresholds:
  Warning:   80% of budget (yellow/orange)
  Critical:  90% of budget (deep orange)
  Exceeded: 100% of budget (red)

Testing Workflow:
  1. Run this script to create test records with specific costs
  2. Open WebAdmin Budget Management page
  3. Click "Refresh" to reload data
  4. Verify alert appears correctly
  5. Run cleanup command to remove test data
`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  if (args[0] === 'cleanup') {
    await cleanupTestRecords();
    process.exit(0);
  }

  if (args.length < 2) {
    console.error('\n❌ Error: Missing required arguments\n');
    console.error('Usage: node scripts/test-budget-alerts.cjs <period> <alert-level>');
    console.error('Run with "help" for more information.\n');
    process.exit(1);
  }

  const [period, alertLevel] = args;

  // Validate inputs
  const validPeriods = ['daily', 'weekly', 'monthly'];
  const validAlertLevels = ['warning', 'critical', 'exceeded'];

  if (!validPeriods.includes(period)) {
    console.error(`\n❌ Error: Invalid period "${period}"`);
    console.error(`Valid options: ${validPeriods.join(', ')}\n`);
    process.exit(1);
  }

  if (!validAlertLevels.includes(alertLevel)) {
    console.error(`\n❌ Error: Invalid alert level "${alertLevel}"`);
    console.error(`Valid options: ${validAlertLevels.join(', ')}\n`);
    process.exit(1);
  }

  try {
    // Get current admin user's UID to create test records under their account
    let userId = null;
    try {
      console.log('\n🔍 Looking for admin user...');
      const usersSnapshot = await firestore
        .collection('users')
        .where('role', '==', 'admin')
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        userId = usersSnapshot.docs[0].id;
        const userData = usersSnapshot.docs[0].data();
        console.log(`✅ Found admin user: ${userData.email || userData.display_name} (UID: ${userId})`);
      } else {
        console.warn('⚠️  No admin user found in Firestore. Test records will use default user_id.');
      }
    } catch (err) {
      console.warn('⚠️  Could not fetch admin user:', err.message);
    }

    await testBudgetAlert(period, alertLevel, userId);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
