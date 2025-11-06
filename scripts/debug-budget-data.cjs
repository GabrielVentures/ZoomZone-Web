/**
 * Debug Budget Data Loading
 * This script verifies that test records are created with correct field names
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

const firestore = admin.firestore();

async function debugBudgetData() {
  console.log('\n🔍 Debugging Budget Data...\n');

  // Fetch test records
  const snapshot = await firestore
    .collection('scan_records')
    .where('username', '>=', '[TEST-BUDGET]')
    .where('username', '<=', '[TEST-BUDGET]\uf8ff')
    .limit(3)
    .get();

  if (snapshot.empty) {
    console.log('❌ No test records found!\n');
    return;
  }

  console.log(`Found ${snapshot.size} test record(s):\n`);

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Record ${index + 1}: ${doc.id}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Check timestamp field
    console.log('\n📅 Timestamp Fields:');
    console.log(`   timestamp (lowercase): ${data.timestamp ? 'EXISTS' : 'MISSING'}`);
    console.log(`   Timestamp (uppercase): ${data.Timestamp ? 'EXISTS' : 'MISSING'}`);
    if (data.timestamp) {
      console.log(`   Type: ${data.timestamp.constructor.name}`);
      console.log(`   Value: ${data.timestamp.toDate()}`);
    }

    // Check ai_cost field
    console.log('\n💰 AI Cost Fields:');
    console.log(`   ai_cost: ${data.ai_cost ? 'EXISTS' : 'MISSING'}`);
    if (data.ai_cost) {
      console.log(`   Structure:`, JSON.stringify(data.ai_cost, null, 2));
      console.log(`   total_cost_usd: ${data.ai_cost.total_cost_usd}`);
    }

    // Check other fields
    console.log('\n📝 Other Fields:');
    console.log(`   username: ${data.username}`);
    console.log(`   user_id: ${data.user_id}`);
    console.log(`   merchant: ${data.merchant}`);
    console.log(`   ai_processed: ${data.ai_processed}`);

    console.log('');
  });

  // Calculate expected budget usage
  let totalCost = 0;
  snapshot.docs.forEach(doc => {
    const cost = doc.data().ai_cost?.total_cost_usd || 0;
    totalCost += cost;
  });

  const allRecordsSnapshot = await firestore
    .collection('scan_records')
    .where('username', '>=', '[TEST-BUDGET]')
    .where('username', '<=', '[TEST-BUDGET]\uf8ff')
    .get();

  let allCost = 0;
  allRecordsSnapshot.docs.forEach(doc => {
    const cost = doc.data().ai_cost?.total_cost_usd || 0;
    allCost += cost;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 EXPECTED BUDGET CALCULATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Test Records: ${allRecordsSnapshot.size}`);
  console.log(`Total Cost: $${allCost.toFixed(4)}`);
  console.log(`Daily Budget Limit: $1.00`);
  console.log(`Expected Usage: ${(allCost / 1.0 * 100).toFixed(1)}%`);

  if (allCost >= 1.0) {
    console.log(`Expected Alert: 🚨 EXCEEDED (Red)`);
  } else if (allCost >= 0.9) {
    console.log(`Expected Alert: ⚠️  CRITICAL (Deep Orange)`);
  } else if (allCost >= 0.8) {
    console.log(`Expected Alert: ⚠️  WARNING (Yellow/Orange)`);
  } else {
    console.log(`Expected Alert: ✅ SAFE (Green)`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 TROUBLESHOOTING TIPS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. Check Browser Console:');
  console.log('   - Open http://localhost:3000/budget');
  console.log('   - Press F12 to open Developer Tools');
  console.log('   - Look for console.log messages or errors\n');

  console.log('2. Check Network Tab:');
  console.log('   - See if Firestore query is fetching data');
  console.log('   - Check response payload contains ai_cost field\n');

  console.log('3. Check Field Mapping:');
  console.log('   - Verify firestoreDataProvider.ts maps fields correctly');
  console.log('   - snake_case (Firestore) → camelCase (Frontend)\n');

  console.log('4. Add Debug Logging:');
  console.log('   - In BudgetManagementPage, add: console.log("Records:", records)');
  console.log('   - In calculateBudgetUsage, add: console.log("Period records:", periodRecords)\n');

  console.log('');
}

debugBudgetData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
