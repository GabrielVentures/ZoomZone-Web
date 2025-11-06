/**
 * Migrate iOS Users Script
 *
 * Migrates existing users without roles to 'mobile_user' role.
 * This script is for transitioning from the old system (no roles) to the new role-based system.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/migrate-ios-users.js
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/migrate-ios-users.js
 *
 * What it does:
 * 1. Finds all users in Firestore without a role field (or role = null)
 * 2. Sets their role to 'mobile_user'
 * 3. Adds migration metadata
 */

const admin = require('firebase-admin');

// ================================
// Configuration
// ================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable is required');
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/migrate-ios-users.js');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
});

const firestore = admin.firestore();

// ================================
// Migration Functions
// ================================

async function findUsersWithoutRole() {
  console.log('🔍 Finding users without role...\n');

  const allUsers = [];

  // Get all users from Firestore
  const usersSnapshot = await firestore.collection('users').get();

  usersSnapshot.forEach((doc) => {
    const userData = doc.data();

    // Check if user has no role or role is null
    if (!userData.role || userData.role === null) {
      allUsers.push({
        id: doc.id,
        email: userData.email || 'No email',
        currentRole: userData.role || 'No role',
      });
    }
  });

  return allUsers;
}

async function migrateUser(userId, email) {
  try {
    const userRef = firestore.collection('users').doc(userId);

    await userRef.update({
      role: 'mobile_user',
      platform: 'ios',
      migrated_at: admin.firestore.FieldValue.serverTimestamp(),
      migrated_by: 'migration-script',
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('   Migrate iOS Users Script');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  try {
    // Step 1: Find users without roles
    const usersToMigrate = await findUsersWithoutRole();

    if (usersToMigrate.length === 0) {
      console.log('✅ No users found without roles.');
      console.log('All users already have roles assigned.\n');
      return;
    }

    console.log(`Found ${usersToMigrate.length} user(s) without roles:\n`);

    // Display users
    usersToMigrate.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (UID: ${user.id})`);
    });

    console.log('\n📋 Migration Plan:');
    console.log('─────────────────');
    console.log('These users will be:');
    console.log('- Set role to: mobile_user');
    console.log('- Set platform to: ios');
    console.log('- Add migration timestamp');
    console.log();

    // Confirm migration
    console.log('⚠️  WARNING: This operation will modify user documents in Firestore.');
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 2: Migrate users
    console.log('🚀 Starting migration...\n');

    let successCount = 0;
    let failCount = 0;

    for (const user of usersToMigrate) {
      process.stdout.write(`Migrating ${user.email}... `);

      const result = await migrateUser(user.id, user.email);

      if (result.success) {
        console.log('✅');
        successCount++;
      } else {
        console.log(`❌ (${result.error})`);
        failCount++;
      }
    }

    // Summary
    console.log('\n✅ Migration Complete!');
    console.log('=================================');
    console.log(`Total users:     ${usersToMigrate.length}`);
    console.log(`Migrated:        ${successCount}`);
    console.log(`Failed:          ${failCount}`);
    console.log('=================================\n');

    if (successCount > 0) {
      console.log('📋 Next steps:');
      console.log('1. Verify migrated users with: GCLOUD_PROJECT=' + PROJECT_ID + ' node scripts/list-users.js');
      console.log('2. Deploy updated Firestore rules: firebase deploy --only firestore:rules');
      console.log('3. Test iOS app login still works');
      console.log('4. Test that iOS users cannot login to WebAdmin\n');
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
