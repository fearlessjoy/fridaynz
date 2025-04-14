import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, getUserProfile } from "./firebase";

type UserData = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  error?: string;
  [key: string]: any;
};

type AuthContextType = {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  authInitialized: boolean;
  loadUserProfile: () => Promise<void>;
  profileError: string | null;
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  authInitialized: false,
  loadUserProfile: async () => {},
  profileError: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoadAttempts, setProfileLoadAttempts] = useState(0);

  // Function to load user profile data separately from auth state
  const loadUserProfile = async () => {
    // Don't proceed if there's no current user, already loading, 
    // or already tried too many times
    if (!currentUser || profileLoading || profileLoadAttempts > 2) return;
    
    try {
      setProfileLoading(true);
      setProfileError(null);
      console.log("Loading user profile for:", currentUser.uid);
      
      // Set basic user data immediately
      setUserData({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      });
      
      // Only attempt to get the profile data from Firestore
      // if we haven't already had too many failures
      if (profileLoadAttempts < 2) {
        const profile = await getUserProfile(currentUser.uid);
        
        if (profile) {
          setUserData(prev => ({
            ...prev,
            ...profile,
          }));
        }
      }
      
      setProfileLoaded(true);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setProfileError(error.message || "Failed to load user profile");
      setProfileLoadAttempts(prev => prev + 1);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log("Setting up auth state listener");
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
      
      if (isMounted) {
        setCurrentUser(user);
        
        // Reset user data and profile loaded flag on auth state change
        if (!user) {
          setUserData(null);
          setProfileLoaded(false);
          setProfileLoadAttempts(0);
          setProfileError(null);
        } else {
          // Set basic user data immediately
          setUserData({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        }
        
        setLoading(false);
        setAuthInitialized(true);
      }
    });

    // Cleanup subscription
    return () => {
      console.log("Cleaning up auth state listener");
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    authInitialized,
    loadUserProfile,
    profileError,
  };

  // Show a loading state while Firebase initializes
  if (!authInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 