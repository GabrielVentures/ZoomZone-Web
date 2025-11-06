/**
 * Compare Test Records with Real Records
 * Debug why test records are not loaded by frontend
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

const firestore = admin.firestore();

async function compareRecords() {
  console.log('\n🔍 Comparing Test Records with Real Records\n');
  console.log('━'.repeat(80));

  // Fetch all scan records
  const allSnapshot = await firestore
    .collection('scan_records')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  console.log(`\n📊 Total records found: ${allSnapshot.size}\n`);

  allSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const isTest = data.username?.includes('[TEST-BUDGET]');

    console.log(`${index + 1}. ${isTest ? '🧪 TEST' : '📱 REAL'} Record: ${doc.id}`);
    console.log(`   Username: ${data.username || data.Username || 'MISSING'}`);
    console.log(`   User_ID (snake): ${data.user_id || 'MISSING'}`);
    console.log(`   User_ID (pascal): ${data.User_ID || 'MISSING'}`);
    console.log(`   Timestamp (lowercase): ${data.timestamp ? data.timestamp.toDate().toISOString() : 'MISSING'}`);
    console.log(`   Timestamp (uppercase): ${data.Timestamp ? data.Timestamp.toDate().toISOString() : 'MISSING'}`);
    console.log(`   AI Cost: ${data.ai_cost ? '$' + data.ai_cost.total_cost_usd : 'MISSING'}`);
    console.log(`   AI Processed: ${data.ai_processed !== undefined ? data.ai_processed : 'MISSING'}`);
    console.log(`   Merchant: ${data.merchant || data.Merchant || 'MISSING'}`);
    console.log(`   Barcode: ${data.barcode || data.Barcode || 'MISSING'}`);
    console.log(`   Image URL: ${data.image_url || data.Image_URL || 'MISSING'}`);
    console.log('');
  });

  // Get one test record and one real record for detailed comparison
  const testSnapshot = await firestore
    .collection('scan_records')
    .where('username', '>=', '[TEST-BUDGET]')
    .where('username', '<=', '[TEST-BUDGET]\uf8ff')
    .limit(1)
    .get();

  const realSnapshot = await firestore
    .collection('scan_records')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (!testSnapshot.empty && !realSnapshot.empty) {
    const testDoc = testSnapshot.docs[0];
    const realDoc = realSnapshot.docs[0];

    console.log('━'.repeat(80));
    console.log('\n📋 DETAILED FIELD COMPARISON\n');

    const testData = testDoc.data();
    const realData = realDoc.data();

    const allKeys = new Set([...Object.keys(testData), ...Object.keys(realData)]);

    console.log('Field'.padEnd(30), 'Test Record'.padEnd(25), 'Real Record');
    console.log('─'.repeat(80));

    for (const key of allKeys) {
      const testValue = testData[key];
      const realValue = realData[key];

      let testDisplay = 'MISSING';
      let realDisplay = 'MISSING';

      if (testValue !== undefined) {
        if (testValue?.toDate) {
          testDisplay = testValue.toDate().toISOString().substring(0, 19);
        } else if (typeof testValue === 'object') {
          testDisplay = JSON.stringify(testValue).substring(0, 20) + '...';
        } else {
          testDisplay = String(testValue).substring(0, 22);
        }
      }

      if (realValue !== undefined) {
        if (realValue?.toDate) {
          realDisplay = realValue.toDate().toISOString().substring(0, 19);
        } else if (typeof realValue === 'object') {
          realDisplay = JSON.stringify(realValue).substring(0, 20) + '...';
        } else {
          realDisplay = String(realValue).substring(0, 22);
        }
      }

      const match = testValue !== undefined && realValue !== undefined ? '✅' : '⚠️';
      console.log(`${match} ${key.padEnd(28)}`, testDisplay.padEnd(25), realDisplay);
    }
  }

  console.log('\n━'.repeat(80));
  console.log('\n🔍 KEY FINDINGS:\n');

  // Check if test records exist
  const testCount = await firestore
    .collection('scan_records')
    .where('username', '>=', '[TEST-BUDGET]')
    .where('username', '<=', '[TEST-BUDGET]\uf8ff')
    .get();

  console.log(`1. Test records in Firestore: ${testCount.size}`);

  if (testCount.size > 0) {
    const testSample = testCount.docs[0].data();
    console.log(`2. Test record user_id: ${testSample.user_id}`);
    console.log(`3. Test record User_ID: ${testSample.User_ID || 'NOT SET'}`);
    console.log(`4. Test record timestamp type: ${testSample.timestamp?.constructor.name || 'MISSING'}`);
    console.log(`5. Test record ai_cost: ${testSample.ai_cost ? JSON.stringify(testSample.ai_cost) : 'MISSING'}`);
  }

  console.log('\n');
}

compareRecords()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
