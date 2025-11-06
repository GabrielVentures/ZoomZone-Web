const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

async function checkAll() {
  const firestore = admin.firestore();

  // Get ALL records without filter
  const all = await firestore.collection('scan_records').get();
  console.log(`\nTotal scan_records in Firestore: ${all.size}\n`);

  all.docs.forEach((doc, i) => {
    const data = doc.data();
    const isTest = data.username?.includes('[TEST-BUDGET]');
    const cost = data.ai_cost?.total_cost_usd || 0;
    console.log(`${i+1}. ${isTest ? '🧪 TEST' : '📱 REAL'} ${doc.id.substring(0, 20)}... - ${data.username} - $${cost.toFixed(4)}`);
  });

  // Check if A7AA7E1A-001C-4242-88FB-D64658ABBC39 exists
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Checking frontend cached record ID...\n');

  try {
    const specificDoc = await firestore.collection('scan_records').doc('A7AA7E1A-001C-4242-88FB-D64658ABBC39').get();
    if (specificDoc.exists) {
      console.log('✅ Record A7AA7E1A-001C-4242-88FB-D64658ABBC39 EXISTS in Firestore');
      const data = specificDoc.data();
      console.log('   Username:', data.username);
      console.log('   AI Cost:', data.ai_cost?.total_cost_usd);
    } else {
      console.log('❌ Record A7AA7E1A-001C-4242-88FB-D64658ABBC39 NOT FOUND in Firestore');
      console.log('   👉 This means frontend is using STALE CACHE DATA!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n');
}

checkAll().then(() => process.exit(0));
