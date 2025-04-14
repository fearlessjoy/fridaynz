import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Simple ping function to test Firestore connectivity
export const checkFirestoreConnection = async (): Promise<{
  connected: boolean;
  message: string;
  errorDetails?: any;
}> => {
  try {
    // Try to fetch a non-existent document to test connectivity
    // Using .test collection to avoid security rule issues
    console.log("Testing Firestore connection...");
    const docRef = doc(db, "connectionTest", "ping");
    await getDoc(docRef);
    
    console.log("Firestore connection successful");
    return { 
      connected: true, 
      message: "Connection to Firestore established successfully" 
    };
  } catch (error: any) {
    console.error("Firestore connection test failed:", error);
    
    let message = "Failed to connect to Firestore";
    
    // Parse common error types
    if (error.code === 'permission-denied') {
      message = "Firestore security rules are preventing access. Please check your rules.";
    } else if (error.code === 'unavailable') {
      message = "Firestore is currently unavailable. Check your internet connection.";
    } else if (error.code === 'not-found') {
      // Actually positive - we can connect, just document not found
      return { 
        connected: true, 
        message: "Connection to Firestore established successfully (document not found)" 
      };
    } else if (error.message && error.message.includes('quota')) {
      message = "Firestore quota exceeded. Please try again later.";
    } else if (error.message && error.message.includes('network')) {
      message = "Network error connecting to Firestore. Check your internet connection.";
    }
    
    return { 
      connected: false,
      message,
      errorDetails: {
        code: error.code,
        message: error.message,
        name: error.name
      }
    };
  }
};

// Function to help format a more user-friendly error
export const getFirestoreErrorMessage = (error: any): string => {
  if (!error) return "Unknown error";
  
  const errorCode = error.code || '';
  const errorMessage = error.message || '';
  
  switch (errorCode) {
    case 'permission-denied':
      return "You don't have permission to access this data. Please check with your administrator.";
    case 'unavailable':
      return "Firestore is currently unavailable. Please check your internet connection and try again.";
    case 'not-found':
      return "The requested data doesn't exist.";
    case 'cancelled':
      return "The operation was cancelled.";
    case 'invalid-argument':
      return "Invalid data format. Please check your inputs.";
    case 'resource-exhausted':
      return "Service temporarily unavailable. Please try again later.";
    case 'unauthenticated':
      return "Authentication required. Please log in again.";
    default:
      if (errorMessage.includes('quota')) {
        return "Service limits exceeded. Please try again later.";
      } else if (errorMessage.includes('network')) {
        return "Network issue detected. Please check your internet connection.";
      } else if (errorMessage.includes('permission')) {
        return "You don't have permission to access this data.";
      }
      return errorMessage || "An error occurred with Firestore.";
  }
}; 