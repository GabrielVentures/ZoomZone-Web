/**
 * Initialize Global Budget Configuration in Firestore
 *
 * This script creates the global budget config that will be used by:
 * 1. WebAdmin Budget Management page (display and edit)
 * 2. Cloud Functions (enforce quota on iOS API calls)
 *
 * Usage:
 *   GCLOUD_PROJECT=zoom-zone-6619c node scripts/init-global-budget-config.cjs
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.GCLOUD_PROJECT || 'zoom-zone-6619c';
  admin.initializeApp({
    projectId,
  });
}

const firestore = admin.firestore();

// Default budget configuration (matches DEFAULT_BUDGET_CONFIG in budgetUtils.ts)
const DEFAULT_GLOBAL_BUDGET_CONFIG = {
  // Budget limits (USD)
  daily_cost_limit_usd: 1.0,      // $1.00 per day
  weekly_cost_limit_usd: 5.0,     // $5.00 per week
  monthly_cost_limit_usd: 20.0,   // $20.00 per month

  // Enable/disable budget enforcement
  enabled: true,

  // Alert thresholds (percentages)
  alert_thresholds: {
    warning: 80,   // Yellow/Orange alert at 80%
    critical: 90,  // Deep orange alert at 90%
    exceeded: 100, // Red alert at 100%
  },

  // Email alerts (not implemented yet)
  email_alerts: false,
  alert_emails: [],

  // Metadata
  created_at: admin.firestore.Timestamp.now(),
  updated_at: admin.firestore.Timestamp.now(),
  updated_by: 'system', // Will be replaced with actual admin email when saving from WebAdmin
};

async function initGlobalBudgetConfig() {
  console.log('\n🔧 Initializing Global Budget Configuration...\n');
  console.log('━'.repeat(80));

  try {
    // Check if config already exists
    const configRef = firestore.collection('settings').doc('budget_config');
    const configDoc = await configRef.get();

    if (configDoc.exists) {
      console.log('⚠️  Global budget config already exists!');
      console.log('\n📊 Current Configuration:');
      const existingData = configDoc.data();
      console.log(JSON.stringify(existingData, null, 2));

      console.log('\n❓ Options:');
      console.log('   1. Keep existing config (no changes)');
      console.log('   2. To update, delete the document first:');
      console.log('      firebase firestore:delete settings/budget_config');
      console.log('\n');
      return;
    }

    // Create new config
    console.log('📝 Creating new global budget configuration...\n');
    console.log('Configuration:');
    console.log(JSON.stringify(DEFAULT_GLOBAL_BUDGET_CONFIG, null, 2));

    await configRef.set(DEFAULT_GLOBAL_BUDGET_CONFIG);

    console.log('\n✅ Global budget configuration created successfully!\n');
    console.log('━'.repeat(80));
    console.log('\n📋 Next Steps:\n');
    console.log('1. ✅ Global config is now stored in Firestore at: settings/budget_config');
    console.log('2. 🔄 WebAdmin will read from this config on page load');
    console.log('3. 💾 WebAdmin "Save Changes" will update this config');
    console.log('4. 🚀 Cloud Functions will enforce these limits on iOS API calls');
    console.log('\n📍 Location in Firestore:');
    console.log('   Collection: settings');
    console.log('   Document:   budget_config');
    console.log('\n💡 To view the config:');
    console.log('   - Firebase Console → Firestore Database → settings → budget_config');
    console.log('   - Or visit: http://localhost:3000/budget (after WebAdmin is updated)');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error initializing global budget config:', error);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
initGlobalBudgetConfig()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
