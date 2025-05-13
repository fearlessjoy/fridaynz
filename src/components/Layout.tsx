import { PanelLeftIcon, Home, Mail, User, LogOut, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar-nav";
import { Navigation } from "@/components/Navigation";
import RefreshButton from "@/components/RefreshButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

// Components that use useSidebar must be inside SidebarProvider
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isMobile, open, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="grid grid-cols-[auto_1fr] min-h-screen w-full relative">
      <Sidebar>
        <SidebarHeader>
          <SidebarTrigger />
          <h2 className="ml-2 text-lg font-semibold">Fridaynz.com</h2>
        </SidebarHeader>
        <SidebarContent>
          <Navigation />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between px-2">
              <div className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Fridaynz.com
              </div>
              <RefreshButton />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      {/* Floating sidebar toggle button */}
      {(!isMobile && !open) && (
        <Button 
          variant="outline" 
          size="icon"
          className="absolute top-4 left-4 z-50 h-8 w-8 rounded-full shadow-md border"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <PanelLeftIcon className="h-4 w-4 rotate-180" />
        </Button>
      )}
      
      <main className={cn("flex-1", isMobile && "pb-14")}>
        {children}
      </main>
      
      {/* Mobile Navigation Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 h-14 border-t bg-background flex items-center justify-around z-20">
          <Button 
            variant="ghost" 
            className="flex flex-col items-center justify-center h-full w-full rounded-none" 
            onClick={() => navigate('/')}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex flex-col items-center justify-center h-full w-full rounded-none" 
            onClick={() => navigate('/messaging')}
          >
            <Mail className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Messages</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex flex-col items-center justify-center h-full w-full rounded-none" 
            onClick={() => navigate('/documents')}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Documents</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center h-full w-full rounded-none"
              >
                <User className="h-5 w-5" />
                <span className="text-[10px] mt-0.5">Profile</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
} 