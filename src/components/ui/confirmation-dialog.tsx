import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "destructive" | "warning" | "default"
  icon?: React.ReactNode
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          iconColor: "text-destructive",
          confirmButtonClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        }
      case "warning":
        return {
          iconColor: "text-orange-500",
          confirmButtonClass: "bg-orange-500 hover:bg-orange-600 text-white"
        }
      default:
        return {
          iconColor: "text-primary",
          confirmButtonClass: "bg-primary hover:bg-primary/90 text-primary-foreground"
        }
    }
  }

  const styles = getVariantStyles()
  const defaultIcon = variant === "destructive" ? <Trash2 className="h-5 w-5" /> : 
                     variant === "warning" ? <AlertTriangle className="h-5 w-5" /> : 
                     <Edit3 className="h-5 w-5" />

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          <div className={cn("mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2", 
            variant === "destructive" ? "border-destructive/20 bg-destructive/10" :
            variant === "warning" ? "border-orange-500/20 bg-orange-500/10" :
            "border-primary/20 bg-primary/10"
          )}>
            <div className={styles.iconColor}>
              {icon || defaultIcon}
            </div>
          </div>
          <AlertDialogTitle className="text-lg font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={cn("w-full sm:w-auto", styles.confirmButtonClass)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}