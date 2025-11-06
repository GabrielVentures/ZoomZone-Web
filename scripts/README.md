# Admin User Management Scripts

This directory contains Firebase Admin SDK scripts for managing users in ShelfTagSnap WebAdmin.

## Prerequisites

Install Firebase Admin SDK:

```bash
npm install firebase-admin --save-dev
```

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `init-first-admin.js` | Create first super-admin (one-time setup) | `GCLOUD_PROJECT=project-id node scripts/init-first-admin.js <email> <password>` |
| `create-admin-user.js` | Create new users with specified role | `GCLOUD_PROJECT=project-id node scripts/create-admin-user.js <email> <password> <role>` |
| `list-users.js` | List all users with roles and status | `GCLOUD_PROJECT=project-id node scripts/list-users.js` |
| `set-user-role.js` | Change user's role | `GCLOUD_PROJECT=project-id node scripts/set-user-role.js <email> <role>` |
| `deactivate-user.js` | Disable user account | `GCLOUD_PROJECT=project-id node scripts/deactivate-user.js <email>` |
| `reactivate-user.js` | Re-enable user account | `GCLOUD_PROJECT=project-id node scripts/reactivate-user.js <email>` |

## Quick Start

### 1. Create Your First Admin

```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/init-first-admin.js admin@example.com SecurePass123!
```

### 2. List All Users

```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js
```

### 3. Create Additional Users

```bash
# Create admin
GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js admin2@example.com password123 admin

# Create regular user
GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js user@example.com password123 user

# Create viewer
GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js viewer@example.com password123 viewer
```

## User Roles

- **admin**: Full access (read, write, delete, admin pages)
- **user**: Can view and create records
- **viewer**: Read-only access

## Detailed Documentation

### init-first-admin.js

**Purpose**: Bootstrap script to create the very first super-admin account.

**Features**:
- Safety check: Won't create admin if one already exists
- Creates user in Firebase Auth and Firestore
- Marks as super-admin in metadata
- Perfect for initial setup

**Example**:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/init-first-admin.js admin@example.com MySecurePassword123!
```

**Output**:
```
=================================
  Initialize First Admin Script
=================================
Project: zoom-zone-6619c

✅ SUCCESS! First admin created successfully
=================================
UID:          abc123
Email:        admin@example.com
Role:         admin (super-admin)
Display Name: Super Admin
=================================
```

---

### create-admin-user.js

**Purpose**: Create new users with specified role (admin, user, or viewer).

**Features**:
- Validates email, password, and role
- Creates Firebase Auth account
- Creates Firestore user document
- Supports optional display name

**Example**:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js user@example.com SecurePass123! user "John Doe"
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Output**:
```
=================================
   Create Admin User Script
=================================
Project: zoom-zone-6619c

✅ SUCCESS! User created successfully
=================================
UID:          xyz789
Email:        user@example.com
Role:         user
Display Name: John Doe
=================================
```

---

### list-users.js

**Purpose**: List all users in Firebase Authentication with their roles from Firestore.

**Features**:
- Shows email, role, display name, status
- Includes creation date and last login
- Formatted table output
- Role-based sorting (admin first)
- Summary statistics

**Example**:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js
```

**Output**:
```
=================================
      List All Users
=================================
Project: zoom-zone-6619c

┌────────────────────────────────────────────────────────┐
│ Email              │ Role    │ Display Name │ Status  │
├────────────────────────────────────────────────────────┤
│ admin@example.com  │ admin   │ Admin User   │ Active  │
│ user@example.com   │ user    │ Regular User │ Active  │
│ viewer@example.com │ viewer  │ View Only    │ Disabled│
└────────────────────────────────────────────────────────┘

📊 Summary:
─────────────
admin          : 1
user           : 1
viewer         : 1
Total users    : 3
```

---

### set-user-role.js

**Purpose**: Change a user's role in Firestore.

**Features**:
- Updates existing user's role
- Creates user document if missing
- Tracks who made the change
- Shows before/after role

**Example**:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/set-user-role.js user@example.com admin
```

**Output**:
```
=================================
     Set User Role Script
=================================
Project: zoom-zone-6619c

✅ SUCCESS! User role updated
=================================
UID:       xyz789
Email:     user@example.com
Old Role:  user
New Role:  admin
=================================

📋 Next steps:
1. User must log out and log back in for role change to take effect
2. Verify user has correct permissions in WebAdmin
```

---

### deactivate-user.js

**Purpose**: Disable a user account (soft delete).

**Features**:
- Disables user in Firebase Auth
- Updates Firestore is_active flag
- Revokes all active sessions
- Preserves data for audit trail

**Example**:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/deactivate-user.js user@example.com
```

**Output**:
```
=================================
    Deactivate User Script
=================================
Project: zoom-zone-6619c

✅ SUCCESS! User deactivated successfully
=================================
UID:   xyz789
Email: user@example.com
=================================

📋 Actions taken:
1. User disabled in Firebase Authentication
2. is_active set to false in Firestore
3. All active sessions invalidated
4. User data preserved for audit trail
```

---

### reactivate-user.js

**Purpose**: Re-enable a previously deactivated user account.

**Features**:
- Enables user in Firebase Auth
- Updates Firestore is_active flag
- User can log in again

**Example**:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/reactivate-user.js user@example.com
```

**Output**:
```
=================================
    Reactivate User Script
=================================
Project: zoom-zone-6619c

✅ SUCCESS! User reactivated successfully
=================================
UID:   xyz789
Email: user@example.com
=================================

📋 Actions taken:
1. User enabled in Firebase Authentication
2. is_active set to true in Firestore
3. User can now log in again
```

---

## Common Workflows

### Initial Setup

```bash
# 1. Create first admin
GCLOUD_PROJECT=zoom-zone-6619c node scripts/init-first-admin.js admin@example.com SecurePass123!

# 2. Verify user was created
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js

# 3. Test login at http://localhost:3000/login
```

### Adding New Team Member

```bash
# 1. Create user account
GCLOUD_PROJECT=zoom-zone-6619c node scripts/create-admin-user.js newuser@example.com TempPass123! user "New User"

# 2. Verify user was created
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js

# 3. Send credentials to user securely
# 4. Ask user to change password on first login
```

### Promoting User to Admin

```bash
# Change role from user to admin
GCLOUD_PROJECT=zoom-zone-6619c node scripts/set-user-role.js user@example.com admin

# Verify role change
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js
```

### Handling Employee Departure

```bash
# 1. Deactivate user
GCLOUD_PROJECT=zoom-zone-6619c node scripts/deactivate-user.js user@example.com

# 2. Verify user is disabled
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js

# 3. Review user's activity (check Firestore audit logs)
# 4. Transfer ownership of any data if needed
```

### Reactivating User

```bash
# If user needs access again
GCLOUD_PROJECT=zoom-zone-6619c node scripts/reactivate-user.js user@example.com

# Verify user is active
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js
```

---

## Environment Variables

### GCLOUD_PROJECT

**Required**: Yes
**Purpose**: Specifies which Firebase project to connect to

**Options**:
```bash
# Option 1: Set inline (recommended)
GCLOUD_PROJECT=zoom-zone-6619c node scripts/list-users.js

# Option 2: Export for session
export GCLOUD_PROJECT=zoom-zone-6619c
node scripts/list-users.js

# Option 3: Use FIREBASE_PROJECT_ID instead
FIREBASE_PROJECT_ID=zoom-zone-6619c node scripts/list-users.js
```

---

## Error Handling

### "GCLOUD_PROJECT environment variable is required"

**Solution**: Set the project ID when running the script:
```bash
GCLOUD_PROJECT=zoom-zone-6619c node scripts/your-script.js
```

### "User with email X already exists"

**Solutions**:
- Use different email address
- Update existing user with `set-user-role.js`
- Deactivate existing user first if needed

### "Invalid email format"

**Solution**: Ensure email follows format: `user@domain.com`

### "Password must be at least 8 characters long"

**Solution**: Use stronger password meeting requirements:
- Minimum 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Special character

### "Module not found: firebase-admin"

**Solution**: Install Firebase Admin SDK:
```bash
npm install firebase-admin --save-dev
```

### "Permission denied"

**Solutions**:
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check Firebase project authentication settings
- Verify service account has correct permissions

---

## Security Best Practices

### ✅ DO:

1. **Use Strong Passwords**
   - All passwords validated by scripts
   - Minimum 8 characters with complexity requirements

2. **Run Scripts from Secure Environment**
   - Developer machine or CI/CD pipeline
   - Never expose scripts to public internet
   - Don't commit credentials to version control

3. **Deactivate, Don't Delete**
   - Use `deactivate-user.js` instead of deleting
   - Preserves audit trail and compliance
   - Can be reactivated if needed

4. **Regular Audits**
   - Run `list-users.js` monthly
   - Review active accounts
   - Deactivate unused accounts

### ❌ DON'T:

1. **Never Share Credentials**
   - Create separate account for each admin
   - Use temporary passwords
   - Force password change on first login

2. **Never Commit Secrets**
   - Don't hardcode project IDs
   - Don't commit service account keys
   - Use environment variables

3. **Never Skip Validation**
   - Scripts validate all inputs
   - Don't modify scripts to bypass checks
   - Follow password requirements

---

## Testing

### Test in Development First

```bash
# Use development project
GCLOUD_PROJECT=your-dev-project node scripts/create-admin-user.js test@example.com TestPass123! user

# Verify user was created
GCLOUD_PROJECT=your-dev-project node scripts/list-users.js

# Test login
# Test permissions
# Test deactivation/reactivation

# Delete test user after testing
GCLOUD_PROJECT=your-dev-project node scripts/deactivate-user.js test@example.com
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Test all scripts in development environment
- [ ] Verify Firestore security rules are correct
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Document admin creation process for your team
- [ ] Set up secure credential storage (password manager)
- [ ] Plan for disaster recovery (at least one admin account)

### Creating Production Admin

```bash
# 1. Create first production admin
GCLOUD_PROJECT=your-prod-project node scripts/init-first-admin.js admin@yourcompany.com SecureProductionPass123!

# 2. Verify in Firebase Console
# 3. Test login at production URL
# 4. Create backup admin account
# 5. Document credentials securely
```

---

## Troubleshooting

### Script Hangs or Times Out

**Possible Causes**:
- Network issues
- Firebase project not accessible
- Wrong project ID

**Solutions**:
- Check internet connection
- Verify project ID is correct
- Check Firebase project status

### "User not found" but User Exists

**Possible Causes**:
- User in Firestore but not Firebase Auth
- User deleted from Firebase Auth only

**Solutions**:
- Use `create-admin-user.js` to recreate Auth account
- Verify user exists in Firebase Console → Authentication

### Role Changes Not Taking Effect

**Cause**: User's session still has old role cached

**Solution**:
1. User must log out
2. User logs back in
3. New role permissions apply

---

## Integration with WebAdmin

These scripts work seamlessly with the WebAdmin RBAC system:

1. **Scripts create users** → Firebase Auth + Firestore
2. **User logs in** → WebAdmin authProvider
3. **Frontend checks role** → RBAC components
4. **Database enforces rules** → Firestore security rules

The entire flow is secure at every level.

---

## Future Enhancements

### Planned Features:

1. **Cloud Function Integration**
   - Call scripts from WebAdmin UI
   - Admin-to-admin user creation
   - No terminal access needed

2. **Email Invitation System**
   - Send invitation emails
   - Temporary password generation
   - Force password change on first login

3. **Bulk Operations**
   - Import users from CSV
   - Bulk role updates
   - Mass deactivation

4. **Audit Logging**
   - Log all user management operations
   - Track who created/modified accounts
   - Export audit reports

---

## Related Documentation

- `ADMIN_USER_MANAGEMENT.md` - Complete best practices guide
- `ADMIN_SETUP_QUICKSTART.md` - Quick start guide
- `ADMIN_USER_MANAGEMENT_SUMMARY.md` - Summary and Q&A
- `RBAC_USAGE.md` - Role-based access control guide
- `SECURITY_ANALYSIS.md` - Security audit and recommendations

---

## Support

If you encounter issues:

1. Check error message and consult troubleshooting section
2. Verify prerequisites are met (Firebase Admin SDK installed)
3. Review full documentation in `ADMIN_USER_MANAGEMENT.md`
4. Check Firebase Console for project status
5. Verify Firestore security rules are deployed

---

## Summary

These scripts provide a **secure, controlled way to manage admin users** without needing a public registration page. They integrate seamlessly with the RBAC system and Firestore security rules to ensure proper access control at every level.

**Quick Commands Reference:**

```bash
# Create first admin
GCLOUD_PROJECT=project-id node scripts/init-first-admin.js <email> <password>

# Create user
GCLOUD_PROJECT=project-id node scripts/create-admin-user.js <email> <password> <role>

# List users
GCLOUD_PROJECT=project-id node scripts/list-users.js

# Change role
GCLOUD_PROJECT=project-id node scripts/set-user-role.js <email> <role>

# Deactivate
GCLOUD_PROJECT=project-id node scripts/deactivate-user.js <email>

# Reactivate
GCLOUD_PROJECT=project-id node scripts/reactivate-user.js <email>
```

**Start Here:** `ADMIN_SETUP_QUICKSTART.md`
