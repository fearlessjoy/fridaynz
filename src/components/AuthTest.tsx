import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { FirestoreStatus } from "./FirestoreStatus";

export function AuthTest() {
  const { currentUser, userData, logout, loadUserProfile, authInitialized, profileError } = useAuth();
  const [authInfo, setAuthInfo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Load user profile data when needed
  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
      
      setAuthInfo(JSON.stringify({
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        providerId: currentUser.providerId,
        lastLoginAt: currentUser.metadata.lastSignInTime,
        createdAt: currentUser.metadata.creationTime,
      }, null, 2));
    } else {
      setAuthInfo("");
    }
  }, [currentUser, loadUserProfile]);

  const handleTestLogout = async () => {
    try {
      setLoading(true);
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      setLoading(true);
      await loadUserProfile();
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Authentication Status</CardTitle>
            {currentUser ? (
              <Badge variant="secondary" className="bg-green-500 text-white">
                <CheckCircle className="h-3 w-3 mr-1" /> Authenticated
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> Not Authenticated
              </Badge>
            )}
          </div>
          <CardDescription>
            Check your current authentication status and Firebase user data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded bg-muted p-4">
            <h3 className="text-sm font-medium mb-2">Firebase Authentication:</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="text-xs">Initialized:</div>
              <div className="text-xs font-medium">{authInitialized ? "Yes" : "No"}</div>
              
              <div className="text-xs">Status:</div>
              <div className="text-xs font-medium">{currentUser ? "Logged In" : "Logged Out"}</div>
              
              {currentUser && (
                <>
                  <div className="text-xs">User Email:</div>
                  <div className="text-xs font-medium">{currentUser.email}</div>
                </>
              )}
            </div>
            
            <h4 className="text-xs font-medium mt-3 mb-1">User Object:</h4>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40 bg-background p-2 rounded">
              {authInfo || "No authenticated user"}
            </pre>
          </div>
          
          <div className="rounded bg-muted p-4">
            <h3 className="text-sm font-medium mb-2">Firestore User Data:</h3>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40 bg-background p-2 rounded">
              {userData ? JSON.stringify(userData, null, 2) : "No user data"}
            </pre>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshProfile} disabled={!currentUser || loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh Profile
            </Button>
            <Button variant="destructive" onClick={handleTestLogout} disabled={!currentUser || loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Logout
            </Button>
          </div>
          
          {profileError && (
            <div className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded border border-red-200">
              <strong>Error:</strong> {profileError}
            </div>
          )}
        </CardContent>
      </Card>
      
      <FirestoreStatus />
    </div>
  );
} 