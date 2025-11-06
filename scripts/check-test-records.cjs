const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

const firestore = admin.firestore();

async function checkTestRecords() {
  const snapshot = await firestore
    .collection('scan_records')
    .where('username', '>=', '[TEST-BUDGET]')
    .where('username', '<=', '[TEST-BUDGET]\uf8ff')
    .get();

  if (snapshot.empty) {
    console.log('\n❌ No test records found.\n');
    return;
  }

  let totalCost = 0;
  console.log(`\n📊 Found ${snapshot.size} test record(s):\n`);

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const cost = data.ai_cost?.total_cost_usd || 0;
    totalCost += cost;
    console.log(`   ${index + 1}. Cost: $${cost.toFixed(4)} - ${data.username} (ID: ${doc.id})`);
  });

  console.log(`\n💰 Total Cost Today: $${totalCost.toFixed(4)}`);
  console.log(`📅 Daily Budget Limit: $1.00`);
  console.log(`📈 Usage Percentage: ${(totalCost / 1.0 * 100).toFixed(1)}%`);

  if (totalCost >= 1.0) {
    console.log(`\n🚨 ALERT: Budget EXCEEDED!`);
  } else if (totalCost >= 0.9) {
    console.log(`\n⚠️  ALERT: Budget CRITICAL!`);
  } else if (totalCost >= 0.8) {
    console.log(`\n⚠️  ALERT: Budget WARNING!`);
  } else {
    console.log(`\n✅ Status: Within budget`);
  }
  console.log('');
}

checkTestRecords().then(() => process.exit(0)).catch(console.error);
