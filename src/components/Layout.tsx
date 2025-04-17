import { PanelLeftIcon } from "lucide-react";
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

// Floating sidebar button that appears when sidebar is closed
function FloatingSidebarButton() {
  const { open, toggleSidebar, isMobile } = useSidebar();
  
  if (isMobile || open) return null;
  
  return (
    <Button 
      variant="outline" 
      size="icon"
      className="absolute top-4 left-4 z-50 h-8 w-8 rounded-full shadow-md border"
      onClick={toggleSidebar}
      aria-label="Open sidebar"
    >
      <PanelLeftIcon className="h-4 w-4 rotate-180" />
    </Button>
  );
}

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
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
        <FloatingSidebarButton />
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
} 