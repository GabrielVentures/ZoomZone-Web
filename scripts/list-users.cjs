/**
 * List Users Script
 *
 * Lists all users in Firebase Authentication with their roles from Firestore.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/list-users.js
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js
 */

const admin = require('firebase-admin');

// ================================
// Configuration
// ================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable is required');
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/list-users.js');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
});

const auth = admin.auth();
const firestore = admin.firestore();

// ================================
// Helper Functions
// ================================

async function getUserRole(uid) {
  try {
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return userDoc.data().role || 'No role';
    }
    return 'No Firestore doc';
  } catch (error) {
    return 'Error reading role';
  }
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('      List All Users');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  try {
    console.log('📋 Fetching users from Firebase Authentication...\n');

    // List all users
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);

    // Fetch roles for all users
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const role = await getUserRole(user.uid);
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'N/A',
          role: role,
          disabled: user.disabled,
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime || 'Never',
        };
      })
    );

    // Sort by role (admin first) then by email
    usersWithRoles.sort((a, b) => {
      const roleOrder = { admin: 0, user: 1, viewer: 2 };
      const roleA = roleOrder[a.role] ?? 999;
      const roleB = roleOrder[b.role] ?? 999;

      if (roleA !== roleB) {
        return roleA - roleB;
      }

      return a.email.localeCompare(b.email);
    });

    // Print table
    console.log('┌────────────────────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Email                          │ Role    │ Display Name      │ Status   │ Created    │ Last Login │');
    console.log('├────────────────────────────────────────────────────────────────────────────────────────────────────┤');

    usersWithRoles.forEach((user) => {
      const email = user.email.padEnd(30, ' ').substring(0, 30);
      const role = user.role.padEnd(7, ' ').substring(0, 7);
      const displayName = user.displayName.padEnd(17, ' ').substring(0, 17);
      const status = user.disabled ? 'Disabled' : 'Active  ';
      const created = formatDate(user.creationTime).padEnd(10, ' ');
      const lastLogin = formatDate(user.lastSignInTime).padEnd(10, ' ').substring(0, 10);

      console.log(`│ ${email} │ ${role} │ ${displayName} │ ${status} │ ${created} │ ${lastLogin} │`);
    });

    console.log('└────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');

    // Summary
    const summary = usersWithRoles.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = 0;
      }
      acc[user.role]++;
      return acc;
    }, {});

    console.log('📊 Summary:');
    console.log('─────────────');
    Object.entries(summary).forEach(([role, count]) => {
      console.log(`${role.padEnd(15)}: ${count}`);
    });
    console.log(`Total users     : ${users.length}\n`);

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
