import * as React from "react";
import { Dialog as RadixDialog } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

interface StableDialogCommentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title: string;
  description?: string;
}

// This component is specifically for comments dialogs to prevent them from closing after adding comments
const StableDialogComments: React.FC<StableDialogCommentsProps> = ({ 
  open, 
  onOpenChange, 
  children,
  title,
  description
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
      <DialogContent className="sm:max-w-[550px] h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </RadixDialog>
  );
};

export { StableDialogComments }; 