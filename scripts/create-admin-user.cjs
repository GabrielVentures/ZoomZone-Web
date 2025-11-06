/**
 * Create Admin User Script
 *
 * Creates a new user in Firebase Authentication and Firestore with specified role.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/create-admin-user.js <email> <password> <role>
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js admin@example.com SecurePass123! admin
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
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/create-admin-user.js <email> <password> <role>');
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

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}

function validatePassword(password) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check for complexity
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    throw new Error('Password must contain uppercase, lowercase, number, and special character');
  }
}

function validateRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }
}

// ================================
// User Creation Functions
// ================================

async function checkUserExists(email) {
  try {
    await auth.getUserByEmail(email);
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return false;
    }
    throw error;
  }
}

async function createUser(email, password, role, displayName = null) {
  console.log('\n🔐 Creating admin user...');
  console.log(`Email: ${email}`);
  console.log(`Role: ${role}`);

  // 1. Check if user already exists
  const exists = await checkUserExists(email);
  if (exists) {
    throw new Error(`User with email ${email} already exists`);
  }

  // 2. Create user in Firebase Authentication
  console.log('\n📝 Creating user in Firebase Authentication...');
  const userRecord = await auth.createUser({
    email,
    password,
    emailVerified: false,
    disabled: false,
    displayName: displayName || email.split('@')[0],
  });

  console.log(`✅ User created in Firebase Auth: ${userRecord.uid}`);

  // 3. Create user document in Firestore
  console.log('\n💾 Creating user document in Firestore...');
  const userDoc = {
    uid: userRecord.uid,
    email: userRecord.email,
    role: role,
    display_name: userRecord.displayName,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: 'admin-script',
    is_active: true,
    metadata: {
      notes: 'Created by admin script',
    },
  };

  await firestore.collection('users').doc(userRecord.uid).set(userDoc);
  console.log(`✅ User document created in Firestore`);

  // 4. Return user info
  return {
    uid: userRecord.uid,
    email: userRecord.email,
    role: role,
    displayName: userRecord.displayName,
  };
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('   Create Admin User Script');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('❌ Error: Missing required arguments');
    console.error('\nUsage:');
    console.error('  GCLOUD_PROJECT=your-project-id node scripts/create-admin-user.js <email> <password> <role> [displayName]');
    console.error('\nExample:');
    console.error('  GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js admin@example.com SecurePass123! admin "Admin User"');
    console.error(`\nValid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const [email, password, role, displayName] = args;

  try {
    // Validate inputs
    console.log('🔍 Validating inputs...');
    validateEmail(email);
    validatePassword(password);
    validateRole(role);
    console.log('✅ Inputs validated\n');

    // Create user
    const user = await createUser(email, password, role, displayName);

    // Success message
    console.log('\n✅ SUCCESS! User created successfully');
    console.log('=================================');
    console.log(`UID:          ${user.uid}`);
    console.log(`Email:        ${user.email}`);
    console.log(`Role:         ${user.role}`);
    console.log(`Display Name: ${user.displayName}`);
    console.log('=================================\n');

    console.log('📧 Next steps:');
    console.log('1. Send login credentials to the user securely');
    console.log('2. Ask user to change password on first login');
    console.log('3. Verify user can login and has correct permissions\n');

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
