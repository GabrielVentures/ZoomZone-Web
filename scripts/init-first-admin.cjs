/**
 * Initialize First Admin Script
 *
 * Bootstrap script to create the first super-admin account.
 * This script checks if any admin exists, and if not, creates the first one.
 *
 * Usage:
 *   GCLOUD_PROJECT=your-project-id node scripts/init-first-admin.js <email> <password>
 *
 * Example:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/init-first-admin.js admin@example.com SecurePass123!
 *
 * Note: This script will NOT create an admin if one already exists (safety feature)
 */

const admin = require('firebase-admin');

// ================================
// Configuration
// ================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable is required');
  console.error('Usage: GCLOUD_PROJECT=your-project-id node scripts/init-first-admin.js <email> <password>');
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

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    throw new Error('Password must contain uppercase, lowercase, number, and special character');
  }
}

// ================================
// Check Functions
// ================================

async function checkAdminExists() {
  console.log('🔍 Checking if any admin user exists...');

  // Query Firestore for any user with role='admin'
  const adminQuery = await firestore
    .collection('users')
    .where('role', '==', 'admin')
    .limit(1)
    .get();

  if (!adminQuery.empty) {
    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data();
    console.log(`⚠️  Admin user already exists: ${adminData.email} (${adminDoc.id})`);
    return true;
  }

  console.log('✅ No admin user found. Safe to create first admin.');
  return false;
}

async function createFirstAdmin(email, password) {
  console.log('\n🔐 Creating first admin user...');
  console.log(`Email: ${email}`);

  // 1. Create user in Firebase Authentication
  console.log('\n📝 Creating user in Firebase Authentication...');
  const userRecord = await auth.createUser({
    email,
    password,
    emailVerified: true, // First admin is pre-verified
    disabled: false,
    displayName: 'Super Admin',
  });

  console.log(`✅ User created in Firebase Auth: ${userRecord.uid}`);

  // 2. Create user document in Firestore
  console.log('\n💾 Creating user document in Firestore...');
  const userDoc = {
    uid: userRecord.uid,
    email: userRecord.email,
    role: 'admin',
    display_name: userRecord.displayName,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: 'system-init',
    is_active: true,
    metadata: {
      notes: 'First admin account (super-admin)',
      is_super_admin: true,
    },
  };

  await firestore.collection('users').doc(userRecord.uid).set(userDoc);
  console.log(`✅ User document created in Firestore`);

  return userRecord;
}

// ================================
// Main Function
// ================================

async function main() {
  console.log('=================================');
  console.log('  Initialize First Admin Script');
  console.log('=================================');
  console.log(`Project: ${PROJECT_ID}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Error: Missing required arguments');
    console.error('\nUsage:');
    console.error('  GCLOUD_PROJECT=your-project-id node scripts/init-first-admin.js <email> <password>');
    console.error('\nExample:');
    console.error('  GCLOUD_PROJECT=zoom-zone-6619c node scripts/init-first-admin.js admin@example.com SecurePass123!');
    console.error('\n⚠️  This script will NOT create an admin if one already exists');
    process.exit(1);
  }

  const [email, password] = args;

  try {
    // Validate inputs
    console.log('🔍 Validating inputs...');
    validateEmail(email);
    validatePassword(password);
    console.log('✅ Inputs validated\n');

    // Check if admin already exists
    const adminExists = await checkAdminExists();

    if (adminExists) {
      console.log('\n⚠️  SAFETY CHECK FAILED');
      console.log('=================================');
      console.log('An admin user already exists in the system.');
      console.log('This script will NOT create a new admin.');
      console.log('\nIf you want to create additional admins, use:');
      console.log(`  GCLOUD_PROJECT=${PROJECT_ID} node scripts/create-admin-user.js ${email} <password> admin`);
      console.log('=================================\n');
      process.exit(0);
    }

    // Create first admin
    const user = await createFirstAdmin(email, password);

    // Success message
    console.log('\n✅ SUCCESS! First admin created successfully');
    console.log('=================================');
    console.log(`UID:          ${user.uid}`);
    console.log(`Email:        ${user.email}`);
    console.log(`Role:         admin (super-admin)`);
    console.log(`Display Name: ${user.displayName}`);
    console.log('=================================\n');

    console.log('📋 Next steps:');
    console.log('1. Save these credentials securely');
    console.log('2. Login to WebAdmin with this account');
    console.log('3. Create additional admin users as needed');
    console.log('4. Set up security monitoring and audit logging\n');

    console.log('🔐 Security recommendations:');
    console.log('1. Change the password immediately after first login');
    console.log('2. Enable 2FA for this super-admin account');
    console.log('3. Document who has access to this account');
    console.log('4. Create separate admin accounts for each administrator\n');

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
