/**
 * Firebase Auth Provider for Refine
 * Connects to real Firebase Authentication
 */

import { AuthProvider } from '@refinedev/core';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { secureStorage, getItemCompat } from '@/utils/secureStorage';
import { checkLoginAttempt, recordLoginAttempt, clearThrottleState } from '@/utils/loginThrottle';
import { sessionManager } from '@/utils/sessionManager';
import { WEB_ADMIN_ROLES, type UserRole } from '@/components/auth/RequireRole';

// ================================
// User Data Interface
// ================================

interface UserData {
  id: string;
  email: string;
  name?: string;
  role: UserRole;  // Use UserRole type instead of string
}

// ================================
// Helper Functions
// ================================

/**
 * Fetch user data from Firestore
 */
const fetchUserData = async (firebaseUser: FirebaseUser): Promise<UserData> => {
  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: data.display_name || data.email || firebaseUser.email,
        role: (data.role || 'user') as UserRole,
      };
      console.log('✅ [AuthProvider] User data fetched:', { email: userData.email, role: userData.role });
      return userData;
    }

    // If user document doesn't exist in Firestore, create basic user data
    console.warn('⚠️ [AuthProvider] User document not found in Firestore:', firebaseUser.uid);
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.email || '',
      role: 'user' as UserRole,
    };
  } catch (error) {
    console.error('❌ [AuthProvider] Error fetching user data:', error);
    throw error;
  }
};

/**
 * Get current authenticated user
 */
const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// ================================
// Firebase Auth Provider
// ================================

export const authProvider: AuthProvider = {
  /**
   * Login with email and password
   */
  login: async ({ email, password }) => {
    console.log('🔐 [AuthProvider] login:', { email });

    // Check if login attempt is allowed (throttling)
    const throttleCheck = checkLoginAttempt();

    if (!throttleCheck.allowed) {
      console.warn('🔒 [AuthProvider] Login throttled:', throttleCheck.message);

      return {
        success: false,
        error: {
          name: 'ThrottleError',
          message: throttleCheck.message || 'Too many login attempts. Please try again later.',
        },
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user data from Firestore
      const userData = await fetchUserData(firebaseUser);

      // 🔒 SECURITY CHECK: Only allow WebAdmin roles to login
      // iOS users (mobile_user) cannot access WebAdmin
      const userRole = userData.role as UserRole;
      if (!WEB_ADMIN_ROLES.includes(userRole)) {
        // Sign out the user immediately
        await signOut(auth);

        // Record failed login attempt (unauthorized access)
        recordLoginAttempt(false, email);

        console.warn('🔒 [AuthProvider] Login denied - Mobile-only account:', {
          email: userData.email,
          role: userRole,
        });

        return {
          success: false,
          error: {
            name: 'UnauthorizedError',
            message: '此账号仅限移动应用使用。如需访问 WebAdmin，请联系管理员。',
          },
        };
      }

      // Store user data in encrypted storage
      secureStorage.setItem('auth', userData);

      // Record successful login and clear throttle state
      recordLoginAttempt(true, email);

      console.log('✅ [AuthProvider] Login successful:', userData.email, `(Role: ${userData.role})`);

      return {
        success: true,
        redirectTo: '/',
      };
    } catch (error: any) {
      console.error('❌ [AuthProvider] Login error:', error);

      // Record failed login attempt
      recordLoginAttempt(false, email);

      // Map Firebase error codes to user-friendly messages
      let errorMessage = 'Invalid email or password';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later';
      }

      // Add remaining attempts info
      const remainingAttempts = throttleCheck.remainingAttempts - 1;
      if (remainingAttempts > 0) {
        errorMessage += ` (${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining)`;
      }

      return {
        success: false,
        error: {
          name: 'LoginError',
          message: errorMessage,
        },
      };
    }
  },

  /**
   * Logout
   */
  logout: async () => {
    console.log('🔐 [AuthProvider] logout');

    try {
      await signOut(auth);
      secureStorage.removeItem('auth');
      clearThrottleState(); // Clear login throttle on logout
      sessionManager.destroy(); // Destroy session manager

      console.log('✅ [AuthProvider] Logout successful');

      return {
        success: true,
        redirectTo: '/login',
      };
    } catch (error) {
      console.error('❌ [AuthProvider] Logout error:', error);
      // Even if logout fails, clear secure storage, throttle, and session
      secureStorage.removeItem('auth');
      clearThrottleState();
      sessionManager.destroy();
      return {
        success: true,
        redirectTo: '/login',
      };
    }
  },

  /**
   * Check if user is authenticated
   */
  check: async () => {
    try {
      const firebaseUser = await getCurrentUser();

      if (firebaseUser) {
        // User is authenticated in Firebase
        // Check if we have user data in secure storage (with backward compatibility)
        let userData = getItemCompat<UserData>('auth');

        if (!userData) {
          // Fetch and store user data
          const userDataObj = await fetchUserData(firebaseUser);
          secureStorage.setItem('auth', userDataObj);
        }

        return {
          authenticated: true,
        };
      }

      // User is not authenticated
      secureStorage.removeItem('auth');
      return {
        authenticated: false,
        redirectTo: '/login',
        logout: true,
      };
    } catch (error) {
      console.error('❌ [AuthProvider] Check error:', error);
      return {
        authenticated: false,
        redirectTo: '/login',
        logout: true,
      };
    }
  },

  /**
   * Get user identity
   */
  getIdentity: async () => {
    try {
      const firebaseUser = await getCurrentUser();

      if (!firebaseUser) {
        return null;
      }

      // Try to get from secure storage first (with backward compatibility)
      const cachedAuth = getItemCompat<UserData>('auth');
      if (cachedAuth) {
        return cachedAuth;
      }

      // If not in storage, fetch from Firestore
      const userData = await fetchUserData(firebaseUser);
      secureStorage.setItem('auth', userData);

      return userData;
    } catch (error) {
      console.error('❌ [AuthProvider] getIdentity error:', error);
      return null;
    }
  },

  /**
   * Handle authentication errors
   */
  onError: async (error) => {
    console.error('🔐 [AuthProvider] error:', error);

    if (error.status === 401 || error.status === 403) {
      return {
        logout: true,
        redirectTo: '/login',
        error,
      };
    }

    return { error };
  },

  /**
   * Get user permissions (role)
   */
  getPermissions: async () => {
    try {
      const firebaseUser = await getCurrentUser();

      if (!firebaseUser) {
        console.log('🔐 [AuthProvider] getPermissions: No firebase user');
        return null;
      }

      // Try to get from secure storage first (with backward compatibility)
      const cachedAuth = getItemCompat<UserData>('auth');
      if (cachedAuth) {
        console.log('🔐 [AuthProvider] getPermissions from cache:', cachedAuth.role);
        return cachedAuth.role;
      }

      // If not in storage, fetch from Firestore
      console.log('🔐 [AuthProvider] getPermissions: Fetching from Firestore...');
      const userData = await fetchUserData(firebaseUser);
      console.log('🔐 [AuthProvider] getPermissions from Firestore:', userData.role);
      return userData.role;
    } catch (error) {
      console.error('❌ [AuthProvider] getPermissions error:', error);
      return null;
    }
  },
};
