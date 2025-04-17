import * as React from "react";
import { PanelLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Sheet, SheetContent } from "./sheet";

interface SidebarProviderProps {
  children: React.ReactNode;
}

interface SidebarContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Check if we're on the client side and if the screen is mobile-sized
  const isClient = typeof window !== "undefined";
  const initialIsMobile = isClient ? window.innerWidth < 768 : false;
  
  // Set default state based on screen size - open on desktop, closed on mobile
  const [open, setOpen] = React.useState(!initialIsMobile);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(initialIsMobile);
  
  // Handle window resize to update mobile state
  React.useEffect(() => {
    if (!isClient) return;
    
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-close sidebar when switching to mobile
      if (mobile && open) {
        setOpen(false);
      }
      
      // Auto-open sidebar when switching to desktop
      if (!mobile && !open) {
        setOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient, open]);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(!openMobile);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, openMobile]);

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        isMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  const { open, openMobile, setOpenMobile, isMobile } = useSidebar();

  if (isMobile) {
    return (
      <>
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="p-0 w-64">
            <div className="flex flex-col h-full">{children}</div>
          </SheetContent>
        </Sheet>
        <div className="w-0"></div> {/* Placeholder to maintain grid layout */}
      </>
    );
  }

  return (
    <div
      className={cn(
        "h-screen border-r transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-0",
        open ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div className={cn("flex flex-col h-full overflow-hidden", !open && "invisible w-0")}>{children}</div>
    </div>
  );
}

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div
      className={cn("h-14 flex items-center border-b px-4", className)}
      {...props}
    />
  );
}

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SidebarTrigger({ className, ...props }: SidebarTriggerProps) {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("", className)}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      {...props}
    >
      <PanelLeftIcon className={cn("h-5 w-5 transition-transform", isOpen ? "" : "rotate-180")} />
    </Button>
  );
}

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <div
      className={cn("flex-1 overflow-auto", className)}
      {...props}
    />
  );
}

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div
      className={cn("border-t p-4", className)}
      {...props}
    />
  );
} 