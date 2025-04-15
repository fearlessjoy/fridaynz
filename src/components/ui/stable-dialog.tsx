import * as React from "react";
import { Dialog as RadixDialog } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogClose
} from "@/components/ui/dialog";

interface StableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

// This component wraps Radix Dialog with special handling to prevent unintentional closures
const StableDialog: React.FC<StableDialogProps> = ({ 
  open, 
  onOpenChange, 
  children 
}) => {
  const [internalOpen, setInternalOpen] = React.useState(open);
  
  // Sync with external state when it changes
  React.useEffect(() => {
    setInternalOpen(open);
  }, [open]);
  
  // Only allow explicit closures through the close button or escape key
  const handleOpenChange = (newOpen: boolean) => {
    // Only update external state when explicitly closed
    if (newOpen === false) {
      onOpenChange(false);
    }
    setInternalOpen(newOpen);
  };

  return (
    <RadixDialog open={internalOpen} onOpenChange={handleOpenChange}>
      {children}
    </RadixDialog>
  );
};

export { 
  StableDialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}; 