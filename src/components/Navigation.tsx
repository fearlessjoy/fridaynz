import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Home, Mail, LogOut, User, AlertCircle, Menu, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotificationsMenu } from "./NotificationsMenu";
import { useSidebar } from "@/components/ui/sidebar-nav";

export function Navigation() {
  const { logout, userData, currentUser, loadUserProfile, profileError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadAttempted, setLoadAttempted] = useState(false);
  const { toggleSidebar } = useSidebar();

  // Load user profile data when component mounts
  useEffect(() => {
    if (currentUser && !loadAttempted) {
      loadUserProfile().catch(error => {
        console.error("Error loading profile from Navigation:", error);
      });
      setLoadAttempted(true);
    }
  }, [currentUser, loadUserProfile, loadAttempted]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message || "Failed to logout. Please try again.",
      });
    }
  };

  const handleRetryProfile = () => {
    if (currentUser) {
      setLoadAttempted(false);
      loadUserProfile().catch(error => {
        console.error("Error retrying profile load:", error);
      });
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-lg font-semibold">FridayNZ.com</h2>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
          Main Menu
        </h2>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/messaging')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Messages
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/documents')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </Button>
        </div>
      </div>

      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
          Notifications
        </h2>
        <div className="space-y-1">
          <div className="flex items-center px-3">
            <NotificationsMenu />
            <span className="ml-2">Notifications</span>
          </div>
        </div>
      </div>

      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
          Account
        </h2>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {profileError && (
        <Alert variant="destructive" className="mx-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading profile.{" "}
            <button
              onClick={handleRetryProfile}
              className="underline hover:no-underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 