import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, deleteUser } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  enableNetwork,
  disableNetwork,
  writeBatch
} from "firebase/firestore";

// Firebase configuration with validation
const getFirebaseConfig = () => {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
};

// Firebase configuration with validation
const firebaseConfig = getFirebaseConfig();

// Validate config (minimal check)
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    throw new Error(`Firebase config missing required fields: ${missingFields.join(', ')}`);
  }
};

// Validate before initializing
validateConfig();

// Initialize Firebase
console.log('Initializing Firebase with project ID:', firebaseConfig.projectId);
let app = initializeApp(firebaseConfig);
let auth = getAuth(app);
let db = getFirestore(app);

/**
 * Refreshes the Firebase connection with the latest environment variables
 * Call this function when you need to refresh the connection after changing .env values
 */
export const refreshFirebaseConnection = async () => {
  try {
    console.log('Refreshing Firebase connection...');
    
    // Get fresh config from environment
    const newConfig = getFirebaseConfig();
    console.log('New project ID:', newConfig.projectId);
    
    // Re-initialize Firebase with new config
    app = initializeApp(newConfig, 'refresh-instance');
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Reset network connection
    await resetFirestoreConnection();
    
    console.log('Firebase connection refreshed successfully');
    return true;
  } catch (error) {
    console.error('Failed to refresh Firebase connection:', error);
    return false;
  }
};

// Try to enable/disable network to reset connection
let hasAttemptedReconnect = false;
const resetFirestoreConnection = async () => {
  if (!hasAttemptedReconnect) {
    try {
      console.log('Attempting to reset Firestore connection...');
      await disableNetwork(db);
      await enableNetwork(db);
      hasAttemptedReconnect = true;
      console.log('Successfully reset Firestore connection');
    } catch (error) {
      console.error('Failed to reset Firestore connection:', error);
    }
  }
};

// Check if user is authenticated
const checkAuth = () => {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to perform this operation');
  }
  return auth.currentUser;
};

// Authentication functions
export const registerUser = async (email: string, password: string, userData?: any) => {
  let initialUser: User | null = null;
  try {
    // Store the current user's auth state
    initialUser = auth.currentUser;
    const isAdmin = initialUser ? (await getUserProfile(initialUser.uid))?.userRole === 'admin' : false;
    
    // Create the new user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    // Always create a user profile, using userData if provided or creating a default one
    const defaultUserData = {
      email: newUser.email,
      name: email.split('@')[0], // Default name from email
      userRole: 'user',
      createdBy: initialUser?.uid || newUser.uid,
      teamId: initialUser ? await getUserTeamId(initialUser.uid) : null // Get team ID from admin if exists
    };

    // Merge provided userData with defaults
    const finalUserData = userData ? { ...defaultUserData, ...userData } : defaultUserData;

    // Create the user profile
    await createUserProfile(newUser.uid, finalUserData);
    
    // If there was a previous user logged in, switch back to them
    if (initialUser) {
      await auth.updateCurrentUser(initialUser);
    } else {
      // If no previous user, sign out
      await auth.signOut();
    }
    
    return { user: userCredential.user };
  } catch (error: any) {
    console.error("Error registering user:", error);
    // If profile creation fails, attempt to delete the auth user to maintain consistency
    try {
      const newUser = auth.currentUser;
      if (newUser && (!initialUser || newUser.uid !== initialUser.uid)) {
        await deleteUser(newUser);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up auth user after failed registration:", cleanupError);
    }
    throw error;
  }
};

// Helper function to get user's team ID
const getUserTeamId = async (userId: string) => {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.teamId || null;
  } catch (error) {
    console.error("Error getting user team ID:", error);
    return null;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    console.log(`Logging in user: ${email}`);
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error('Login error:', error.code, error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    console.log('Logging out user');
    return await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error.code, error.message);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// User data functions with authentication checks
export const createUserProfile = async (userId: string, userData: any) => {
  try {
    console.log(`Creating user profile for: ${userId}`);
    const timestamp = new Date();
    
    // Ensure all required fields are present
    const profileData = {
      ...userData,
      userId: userId,
      email: userData.email,
      userRole: userData.userRole || 'user',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userData.createdBy || userId,
      active: true,
      lastLogin: timestamp
    };

    // Create or update the user profile
    const docRef = doc(db, "users", userId);
    await setDoc(docRef, profileData, { merge: true });

    console.log(`Successfully created profile for user: ${userId}`);
    return true;
  } catch (error: any) {
    console.error("Error creating user profile:", error);
    await resetFirestoreConnection();
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    // Verify authentication before accessing Firestore
    console.log(`Getting user profile for: ${userId}`);
    
    // Simpler approach without security checks for troubleshooting
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log(`No profile found for user: ${userId}`);
      return null;
    }
    
    console.log(`Successfully retrieved profile for user: ${userId}`);
    return docSnap.data();
  } catch (error: any) {
    console.error("Error getting user profile:", error);
    await resetFirestoreConnection();
    
    // Return empty profile on error for now to avoid cascading errors
    return {
      email: auth.currentUser?.email || userId,
      displayName: null,
      photoURL: null,
      error: "Failed to load profile"
    };
  }
};

export const updateUserProfile = async (userId: string, data: any) => {
  try {
    const currentUser = checkAuth();
    
    // Get the current user's profile to check if they're an admin
    const currentUserProfile = await getUserProfile(currentUser.uid);
    const isAdmin = currentUserProfile?.userRole === 'admin';
    
    // Only allow users to update their own profile unless they're an admin
    if (currentUser.uid !== userId && !isAdmin) {
      throw new Error('You can only update your own user profile');
    }

    const userRef = doc(db, "users", userId);
    const timestamp = new Date();
    
    const dataWithMeta = {
      ...data,
      updatedAt: timestamp,
      updatedBy: currentUser.uid
    };

    await updateDoc(userRef, dataWithMeta);
    return { id: userId, ...dataWithMeta };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Generic database functions with simple implementation
export const addDocument = async (collectionName: string, data: any, id?: string) => {
  try {
    const user = checkAuth();
    
    const timestamp = new Date();
    const dataWithMeta = {
      ...data,
      createdAt: timestamp,
      userId: user.uid
    };
    
    if (id) {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, dataWithMeta);
      return { id, ...dataWithMeta };
    } else {
      const newDocRef = doc(collection(db, collectionName));
      await setDoc(newDocRef, dataWithMeta);
      return { id: newDocRef.id, ...dataWithMeta };
    }
  } catch (error: any) {
    console.error(`Error adding document to ${collectionName}:`, error);
    await resetFirestoreConnection();
    throw error;
  }
};

export const getDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error: any) {
    console.error(`Error getting document from ${collectionName}:`, error);
    await resetFirestoreConnection();
    throw error;
  }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const user = checkAuth();
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }

    const currentData = docSnap.data();
    const userData = await getUserProfile(user.uid);
    const isAdmin = userData?.userRole === 'admin';

    // For tasks, check permissions based on the type of update
    if (collectionName === 'tasks') {
      // If updating status, verify user owns the task or is admin
      if (data.status !== undefined && currentData.assignedTo !== user.uid && !isAdmin) {
        throw new Error('You can only update the status of your own tasks');
      }

      // If updating comments, allow all users to add comments
      if (data.comments !== undefined) {
        // Ensure we're only adding/updating comments, not modifying other users' comments
        const existingComments = currentData.comments || [];
        const newComments = data.comments.filter((comment: any) => 
          comment.userId === user.uid || 
          existingComments.some((ec: any) => ec.id === comment.id && ec.userId === user.uid)
        );
        data = { ...data, comments: [...existingComments, ...newComments] };
      }
    }
    
    const timestamp = new Date();
    const dataWithMeta = {
      ...data,
      updatedAt: timestamp,
      updatedBy: user.uid
    };
    
    await updateDoc(docRef, dataWithMeta);
    return { id, ...dataWithMeta };
  } catch (error: any) {
    console.error(`Error updating document in ${collectionName}:`, error);
    await resetFirestoreConnection();
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true, id };
  } catch (error: any) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    await resetFirestoreConnection();
    throw error;
  }
};

export const queryCollection = async (collectionName: string, fieldPath: string, operator: any, value: any) => {
  try {
    const user = checkAuth();
    
    // Simplified query that only includes one where clause
    const q = query(collection(db, collectionName), where(fieldPath, operator, value));
    
    const querySnapshot = await getDocs(q);
    const results: any[] = [];
    querySnapshot.forEach((doc) => {
      // Filter client-side to only include documents owned by the user
      const data = doc.data();
      if (!data.userId || data.userId === user.uid) {
        results.push({ id: doc.id, ...data });
      }
    });
    return results;
  } catch (error: any) {
    console.error(`Error querying collection ${collectionName}:`, error);
    await resetFirestoreConnection();
    return [];
  }
};

export const getCollection = async (collectionName: string) => {
  try {
    const user = checkAuth();
    const userData = await getUserProfile(user.uid);
    const isAdmin = userData?.userRole === 'admin';
    
    // Get all documents
    const querySnapshot = await getDocs(collection(db, collectionName));
    const results: any[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // For users collection:
      // - Admins see all active users
      // - Regular users see only themselves
      if (collectionName === 'users') {
        if (isAdmin || data.userId === user.uid) {
          if (data.active !== false) { // Show only active users unless explicitly marked as inactive
            results.push({ id: doc.id, ...data });
          }
        }
      }
      // For tasks collection, show all tasks
      else if (collectionName === 'tasks') {
        results.push({ id: doc.id, ...data });
      }
      // For other collections, only show user's own documents
      else if (!data.userId || data.userId === user.uid) {
        results.push({ id: doc.id, ...data });
      }
    });
    
    return results;
  } catch (error: any) {
    console.error(`Error getting collection ${collectionName}:`, error);
    await resetFirestoreConnection();
    return [];
  }
};

export const ensureAdminRole = async (userId: string) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Create admin profile if it doesn't exist
      await setDoc(docRef, {
        userRole: "admin",
        email: auth.currentUser?.email,
        name: "Admin User",
        role: "Restaurant Owner",
        userId: userId,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      return true;
    } else {
      // Update to ensure admin role
      await updateDoc(docRef, {
        userRole: "admin",
        lastUpdated: new Date()
      });
      return true;
    }
  } catch (error) {
    console.error("Error ensuring admin role:", error);
    throw error;
  }
};

export const deleteUserAccount = async (userId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Get the profile of the user being deleted
    const userToDelete = await getUserProfile(userId);
    if (!userToDelete) {
      throw new Error("User profile not found");
    }

    // Get the current user's profile to check admin status
    const currentUserProfile = await getUserProfile(currentUser.uid);
    const isAdmin = currentUserProfile?.userRole === 'admin';

    // If not admin and not deleting own account, throw error
    if (!isAdmin && currentUser.uid !== userId) {
      throw new Error("Unauthorized to delete this user account");
    }

    // Start with Firestore data deletion
    // Delete user's tasks
    const tasksRef = collection(db, "tasks");
    const taskQuery = query(tasksRef, where("assignedTo", "==", userId));
    const taskSnapshot = await getDocs(taskQuery);
    
    const batch = writeBatch(db);
    
    // Add task deletions to batch
    taskSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's comments
    const tasksWithCommentsQuery = query(tasksRef, where("comments", "array-contains", { userId }));
    const tasksWithComments = await getDocs(tasksWithCommentsQuery);
    
    tasksWithComments.forEach((taskDoc) => {
      const task = taskDoc.data();
      const updatedComments = task.comments.filter((comment: any) => comment.userId !== userId);
      batch.update(taskDoc.ref, { comments: updatedComments });
    });

    // Delete user's approvals
    const tasksWithApprovalsQuery = query(tasksRef, where("approvals", "array-contains", { partnerId: userId }));
    const tasksWithApprovals = await getDocs(tasksWithApprovalsQuery);
    
    tasksWithApprovals.forEach((taskDoc) => {
      const task = taskDoc.data();
      const updatedApprovals = task.approvals.filter((approval: any) => approval.partnerId !== userId);
      batch.update(taskDoc.ref, { approvals: updatedApprovals });
    });

    // Delete user profile
    const userRef = doc(db, "users", userId);
    batch.delete(userRef);

    // Commit all Firestore deletions
    await batch.commit();

    // Handle Auth account deletion
    if (currentUser.uid === userId) {
      // If user is deleting their own account
      await currentUser.delete();
    } else if (isAdmin) {
      // If admin is deleting another user's account, use the Admin SDK endpoint
      const functionUrl = import.meta.env.PROD 
        ? `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/deleteUser`
        : `http://127.0.0.1:5001/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/us-central1/deleteUser`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          adminId: currentUser.uid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete user authentication account' }));
        throw new Error(errorData.message || 'Failed to delete user authentication account');
      }
    }

    console.log("User account fully deleted");
    return true;
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error("Please log out and log in again to delete your account");
    }
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const checkUserExists = async (email: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw error;
  }
};

// Export Firebase instances
export { app, auth, db }; 