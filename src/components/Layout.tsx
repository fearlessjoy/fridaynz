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
} from "@/components/ui/sidebar-nav";
import { Navigation } from "@/components/Navigation";
import RefreshButton from "@/components/RefreshButton";

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="grid grid-cols-[auto_1fr] min-h-screen w-full">
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
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
} 