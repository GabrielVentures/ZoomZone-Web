/**
 * Get Current User UID
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'zoom-zone-6619c' });
}

async function getCurrentUserUID() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node get-current-user-uid.cjs <email>');
    process.exit(1);
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('\n✅ User Found:');
    console.log('   Email:', userRecord.email);
    console.log('   UID:', userRecord.uid);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getCurrentUserUID().then(() => process.exit(0));
