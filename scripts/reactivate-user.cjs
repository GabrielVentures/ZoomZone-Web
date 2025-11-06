/**
 * Reactivate User Script
 *
 * Enables a user in Firebase Authentication and marks as active in Firestore.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/reactivate-user.js <email>
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/reactivate-user.js user@example.com
 */

const admin = require('firebase-admin');

// ================================
// Configuration
// ================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable is required');
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/reactivate-user.js <email>');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
});

const auth = admin.auth();
const firestore = admin.firestore();

// ================================
// Reactivation Functions
// ================================

async function reactivateUser(email) {
  console.log('\n🔐 Reactivating user...');
  console.log(`Email: ${email}`);

  // 1. Get user by email
  console.log('\n🔍 Finding user...');
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`✅ User found: ${userRecord.uid}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new Error(`User with email ${email} not found`);
    }
    throw error;
  }

  // 2. Check if already enabled
  if (!userRecord.disabled) {
    console.log('⚠️  User is already active');
    return userRecord;
  }

  // 3. Enable user in Firebase Authentication
  console.log('\n✅ Enabling user in Firebase Authentication...');
  await auth.updateUser(userRecord.uid, {
    disabled: false,
  });
  console.log('✅ User enabled in Firebase Auth');

  // 4. Update user document in Firestore
  console.log('\n💾 Updating user document in Firestore...');
  const userDocRef = firestore.collection('users').doc(userRecord.uid);
  const userDoc = await userDocRef.get();

  if (userDoc.exists) {
    await userDocRef.update({
      is_active: true,
      reactivated_at: admin.firestore.FieldValue.serverTimestamp(),
      reactivated_by: 'admin-script',
    });
    console.log('✅ User document updated in Firestore');
  } else {
    console.log('⚠️  No user document found in Firestore (skipping)');
  }

  return userRecord;
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('    Reactivate User Script');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('❌ Error: Missing required argument');
    console.error('\nUsage:');
    console.error('  GCLOUD_PROJECT=your-project-id node scripts/reactivate-user.js <email>');
    console.error('\nExample:');
    console.error('  GCLOUD_PROJECT=zoom-zone-6619c node scripts/reactivate-user.js user@example.com');
    process.exit(1);
  }

  const [email] = args;

  try {
    // Reactivate user
    const user = await reactivateUser(email);

    // Success message
    console.log('\n✅ SUCCESS! User reactivated successfully');
    console.log('=================================');
    console.log(`UID:   ${user.uid}`);
    console.log(`Email: ${user.email}`);
    console.log('=================================\n');

    console.log('📋 Actions taken:');
    console.log('1. User enabled in Firebase Authentication');
    console.log('2. is_active set to true in Firestore');
    console.log('3. User can now log in again\n');

    console.log('📧 Next steps:');
    console.log('1. Notify user that their account has been reactivated');
    console.log('2. User can log in with their existing credentials');
    console.log('3. Consider reviewing why account was deactivated\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
