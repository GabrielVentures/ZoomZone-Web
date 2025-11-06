const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

async function verify() {
  const firestore = admin.firestore();
  
  // Get the latest test record
  const snapshot = await firestore
    .collection('scan_records')
    .where('Username', '>=', '[TEST-BUDGET]')
    .where('Username', '<=', '[TEST-BUDGET]\uf8ff')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('❌ No test records found with Username field!');
    return;
  }

  const testDoc = snapshot.docs[0];
  const testData = testDoc.data();

  console.log('\n✅ NEW TEST RECORD FIELDS:\n');
  console.log('ID:', testDoc.id);
  console.log('Username:', testData.Username);
  console.log('User_ID:', testData.User_ID);
  console.log('Timestamp:', testData.Timestamp?.toDate());
  console.log('ai_cost:', testData.ai_cost);
  console.log('\nFull data:');
  console.log(JSON.stringify(testData, null, 2));
}

verify().then(() => process.exit(0));
