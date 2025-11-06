/**
 * Deactivate User Script
 *
 * Disables a user in Firebase Authentication and marks as inactive in Firestore.
 * Preserves user data for audit trail.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/deactivate-user.js <email>
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/deactivate-user.js user@example.com
 */

const admin = require('firebase-admin');

// ================================
// Configuration
// ================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable is required');
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/deactivate-user.js <email>');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
});

const auth = admin.auth();
const firestore = admin.firestore();

// ================================
// Deactivation Functions
// ================================

async function deactivateUser(email) {
  console.log('\n🔐 Deactivating user...');
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

  // 2. Check if already disabled
  if (userRecord.disabled) {
    console.log('⚠️  User is already disabled');
    return userRecord;
  }

  // 3. Disable user in Firebase Authentication
  console.log('\n🚫 Disabling user in Firebase Authentication...');
  await auth.updateUser(userRecord.uid, {
    disabled: true,
  });
  console.log('✅ User disabled in Firebase Auth');

  // 4. Update user document in Firestore
  console.log('\n💾 Updating user document in Firestore...');
  const userDocRef = firestore.collection('users').doc(userRecord.uid);
  const userDoc = await userDocRef.get();

  if (userDoc.exists) {
    await userDocRef.update({
      is_active: false,
      deactivated_at: admin.firestore.FieldValue.serverTimestamp(),
      deactivated_by: 'admin-script',
    });
    console.log('✅ User document updated in Firestore');
  } else {
    console.log('⚠️  No user document found in Firestore (skipping)');
  }

  // 5. Revoke all refresh tokens (force logout)
  console.log('\n🔓 Revoking all refresh tokens (force logout)...');
  await auth.revokeRefreshTokens(userRecord.uid);
  console.log('✅ All sessions invalidated');

  return userRecord;
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('    Deactivate User Script');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('❌ Error: Missing required argument');
    console.error('\nUsage:');
    console.error('  GCLOUD_PROJECT=your-project-id node scripts/deactivate-user.js <email>');
    console.error('\nExample:');
    console.error('  GCLOUD_PROJECT=zoom-zone-6619c node scripts/deactivate-user.js user@example.com');
    process.exit(1);
  }

  const [email] = args;

  try {
    // Deactivate user
    const user = await deactivateUser(email);

    // Success message
    console.log('\n✅ SUCCESS! User deactivated successfully');
    console.log('=================================');
    console.log(`UID:   ${user.uid}`);
    console.log(`Email: ${user.email}`);
    console.log('=================================\n');

    console.log('📋 Actions taken:');
    console.log('1. User disabled in Firebase Authentication');
    console.log('2. is_active set to false in Firestore');
    console.log('3. All active sessions invalidated');
    console.log('4. User data preserved for audit trail\n');

    console.log('ℹ️  To reactivate user, run:');
    console.log(`   GCLOUD_PROJECT=${PROJECT_ID} node scripts/reactivate-user.js ${email}\n`);

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
