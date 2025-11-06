/**
 * Set User Role Script
 *
 * Updates a user's role in Firestore.
 * Creates user document if it doesn't exist.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/set-user-role.js <email> <role>
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/set-user-role.js user@example.com admin
 *
 * Roles: admin, user, viewer
 */

const admin = require('firebase-admin');

// ================================
// Configuration
// ================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable is required');
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/set-user-role.js <email> <role>');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
});

const auth = admin.auth();
const firestore = admin.firestore();

// ================================
// Validation Functions
// ================================

const VALID_ROLES = ['admin', 'user', 'viewer', 'mobile_user'];

function validateRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }
}

// ================================
// Role Update Functions
// ================================

async function setUserRole(email, newRole) {
  console.log('\n🔐 Setting user role...');
  console.log(`Email: ${email}`);
  console.log(`New Role: ${newRole}`);

  // 1. Get user by email
  console.log('\n🔍 Finding user in Firebase Authentication...');
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`✅ User found: ${userRecord.uid}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new Error(`User with email ${email} not found in Firebase Authentication`);
    }
    throw error;
  }

  // 2. Check if user document exists in Firestore
  console.log('\n💾 Checking Firestore user document...');
  const userDocRef = firestore.collection('users').doc(userRecord.uid);
  const userDoc = await userDocRef.get();

  if (userDoc.exists) {
    // User document exists - update role
    const currentData = userDoc.data();
    const oldRole = currentData.role || 'No role';

    if (oldRole === newRole) {
      console.log(`⚠️  User already has role: ${newRole}`);
      console.log('No changes needed.');
      return { userRecord, oldRole, newRole, changed: false };
    }

    console.log(`Current role: ${oldRole}`);
    console.log(`Updating role to: ${newRole}...`);

    await userDocRef.update({
      role: newRole,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_by: 'admin-script',
    });

    console.log('✅ Role updated in Firestore');
    return { userRecord, oldRole, newRole, changed: true };

  } else {
    // User document doesn't exist - create it
    console.log('⚠️  User document not found in Firestore');
    console.log('Creating new user document...');

    const newUserDoc = {
      uid: userRecord.uid,
      email: userRecord.email,
      role: newRole,
      display_name: userRecord.displayName || userRecord.email.split('@')[0],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: 'admin-script',
      is_active: !userRecord.disabled,
      metadata: {
        notes: 'User document created by set-user-role script',
      },
    };

    await userDocRef.set(newUserDoc);
    console.log('✅ User document created in Firestore');

    return { userRecord, oldRole: 'None', newRole, changed: true };
  }
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('     Set User Role Script');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Error: Missing required arguments');
    console.error('\nUsage:');
    console.error('  GCLOUD_PROJECT=your-project-id node scripts/set-user-role.js <email> <role>');
    console.error('\nExample:');
    console.error('  GCLOUD_PROJECT=zoom-zone-6619c node scripts/set-user-role.js user@example.com admin');
    console.error(`\nValid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const [email, role] = args;

  try {
    // Validate inputs
    console.log('🔍 Validating inputs...');
    validateRole(role);
    console.log('✅ Role validated\n');

    // Set user role
    const result = await setUserRole(email, role);

    if (result.changed) {
      // Success message
      console.log('\n✅ SUCCESS! User role updated');
      console.log('=================================');
      console.log(`UID:       ${result.userRecord.uid}`);
      console.log(`Email:     ${result.userRecord.email}`);
      console.log(`Old Role:  ${result.oldRole}`);
      console.log(`New Role:  ${result.newRole}`);
      console.log('=================================\n');

      console.log('📋 Next steps:');
      console.log('1. User must log out and log back in for role change to take effect');
      console.log('2. Verify user has correct permissions in WebAdmin');
      console.log('3. Notify user about the role change\n');
    } else {
      console.log('\nℹ️  No changes made - user already has the specified role\n');
    }

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
