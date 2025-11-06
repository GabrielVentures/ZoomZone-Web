const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

async function checkFields() {
  const firestore = admin.firestore();
  
  const doc = await firestore.collection('scan_records').doc('A7AA7E1A-001C-4242-88FB-D64658ABBC39').get();
  const data = doc.data();
  
  console.log('\n📋 REAL RECORD FIELDS:\n');
  console.log(JSON.stringify(data, null, 2));
}

checkFields().then(() => process.exit(0));
