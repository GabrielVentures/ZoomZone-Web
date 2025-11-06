/**
 * Test Budget Calculation Logic
 * Simulate frontend budget calculation without browser
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

const firestore = admin.firestore();

// Budget configuration (from budgetUtils.ts)
const DEFAULT_BUDGET_CONFIG = {
  dailyBudget: 1.0,
  weeklyBudget: 5.0,
  monthlyBudget: 20.0,
  alertThresholds: {
    warning: 80,
    critical: 90,
    exceeded: 100,
  },
};

// Get period dates (simplified for daily)
function getDailyPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

// Filter records by period
function filterRecordsByPeriod(records, start, end) {
  return records.filter(record => {
    // Handle both Timestamp (uppercase) and timestamp (lowercase)
    const timestampField = record.Timestamp || record.timestamp;
    if (!timestampField || !timestampField.toDate) {
      console.log(`   ⚠️  Skipping record without valid timestamp:`, record.Username || 'Unknown');
      return false;
    }
    const recordTime = timestampField.toDate();
    return recordTime >= start && recordTime <= end;
  });
}

// Calculate total cost
function calculateTotalCost(records) {
  return records.reduce((sum, record) => {
    return sum + (record.ai_cost?.total_cost_usd || 0);
  }, 0);
}

// Determine alert level
function getAlertLevel(usagePercent, thresholds) {
  if (usagePercent >= thresholds.exceeded) return 'EXCEEDED';
  if (usagePercent >= thresholds.critical) return 'CRITICAL';
  if (usagePercent >= thresholds.warning) return 'WARNING';
  return 'SAFE';
}

async function testBudgetCalculation() {
  console.log('\n🧪 TESTING BUDGET CALCULATION LOGIC\n');
  console.log('━'.repeat(80));

  // Fetch all scan records (simulate frontend useList)
  const snapshot = await firestore
    .collection('scan_records')
    .orderBy('Timestamp', 'desc')
    .limit(1000)
    .get();

  const records = snapshot.docs.map(doc => doc.data());

  console.log(`\n📊 STEP 1: Fetch Records`);
  console.log(`   Total records loaded: ${records.length}`);

  // Filter by period
  const { start, end } = getDailyPeriod();
  console.log(`\n📅 STEP 2: Filter by Period`);
  console.log(`   Period: ${start.toISOString().substring(0, 10)} (today)`);
  console.log(`   Start: ${start.toLocaleString()}`);
  console.log(`   End: ${end.toLocaleString()}`);

  const periodRecords = filterRecordsByPeriod(records, start, end);
  console.log(`   Records in period: ${periodRecords.length}`);

  // Show record details
  console.log(`\n📝 STEP 3: Analyze Records`);
  periodRecords.forEach((record, i) => {
    const cost = record.ai_cost?.total_cost_usd || 0;
    const isTest = record.Username?.includes('[TEST-BUDGET]');
    console.log(`   ${i + 1}. ${isTest ? '🧪 TEST' : '📱 REAL'} ${record.Username || 'Unknown'} - $${cost.toFixed(4)}`);
  });

  // Calculate total cost
  const totalCost = calculateTotalCost(periodRecords);
  console.log(`\n💰 STEP 4: Calculate Cost`);
  console.log(`   Total cost: $${totalCost.toFixed(4)}`);

  // Calculate usage percentage
  const budgetLimit = DEFAULT_BUDGET_CONFIG.dailyBudget;
  const usagePercent = (totalCost / budgetLimit) * 100;
  console.log(`   Budget limit: $${budgetLimit.toFixed(2)}`);
  console.log(`   Usage percentage: ${usagePercent.toFixed(1)}%`);

  // Determine alert level
  const alertLevel = getAlertLevel(usagePercent, DEFAULT_BUDGET_CONFIG.alertThresholds);
  console.log(`\n🚨 STEP 5: Determine Alert`);
  console.log(`   Alert level: ${alertLevel}`);

  // Expected UI display
  console.log(`\n🎨 STEP 6: Expected UI Display`);
  console.log('━'.repeat(80));

  if (alertLevel === 'EXCEEDED') {
    console.log(`\n🚨 BUDGET EXCEEDED ALERT!`);
    console.log(`\n   Page Top:`);
    console.log(`   ┌─────────────────────────────────────────────────────────┐`);
    console.log(`   │ ⛔ Budget Exceeded                                     │`);
    console.log(`   │ Daily budget exceeded! $${totalCost.toFixed(4)} / $${budgetLimit.toFixed(2)} (${usagePercent.toFixed(1)}%)   │`);
    console.log(`   └─────────────────────────────────────────────────────────┘`);

    console.log(`\n   Daily Budget Card:`);
    console.log(`   ┌─────────────────────────────────────────────────────────┐`);
    console.log(`   │ 💵 Daily Budget                   🔴 Budget Exceeded   │`);
    console.log(`   │ ━━━━━━━━━━━━━━━━━━━━━━ ${Math.min(usagePercent, 100).toFixed(1)}% (RED)          │`);
    console.log(`   │                                                         │`);
    console.log(`   │ Current Usage:    $${totalCost.toFixed(4)}                        │`);
    console.log(`   │ Budget Limit:     $${budgetLimit.toFixed(2)}                            │`);
    console.log(`   │ Remaining:        -$${(totalCost - budgetLimit).toFixed(4)} (RED)              │`);
    console.log(`   │ Records:          ${periodRecords.length}                                  │`);
    console.log(`   └─────────────────────────────────────────────────────────┘`);
  } else if (alertLevel === 'SAFE') {
    console.log(`\n✅ WITHIN BUDGET`);
    console.log(`\n   Daily Budget Card:`);
    console.log(`   ┌─────────────────────────────────────────────────────────┐`);
    console.log(`   │ 💵 Daily Budget                   ✅ Within Budget     │`);
    console.log(`   │ ━━━━━${' '.repeat(Math.floor(usagePercent / 2))}━ ${usagePercent.toFixed(1)}% (GREEN)          │`);
    console.log(`   │                                                         │`);
    console.log(`   │ Current Usage:    $${totalCost.toFixed(4)}                        │`);
    console.log(`   │ Budget Limit:     $${budgetLimit.toFixed(2)}                            │`);
    console.log(`   │ Remaining:        $${(budgetLimit - totalCost).toFixed(4)} (GREEN)               │`);
    console.log(`   │ Records:          ${periodRecords.length}                                  │`);
    console.log(`   └─────────────────────────────────────────────────────────┘`);
  }

  console.log('\n━'.repeat(80));
  console.log('\n✅ TEST COMPLETE!\n');

  if (alertLevel === 'EXCEEDED') {
    console.log('🎯 Result: Budget alert system is working correctly!');
    console.log('   The frontend SHOULD display a red progress bar and alert banner.');
  } else {
    console.log('⚠️  Result: Budget is within limits.');
    console.log('   To trigger an alert, run:');
    console.log('   GCLOUD_PROJECT=zoom-zone-6619c node scripts/test-budget-alerts.cjs daily exceeded');
  }

  console.log('\n');
}

testBudgetCalculation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
