import * as React from "react"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Trash2, Edit3, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel?: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "destructive" | "warning" | "default"
  icon?: React.ReactNode
  requireTextConfirmation?: boolean
  confirmationKeyword?: string
  loading?: boolean
}

export function EnhancedConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon,
  requireTextConfirmation = false,
  confirmationKeyword = "DELETE",
  loading = false
}: EnhancedConfirmationDialogProps) {
  const [textInput, setTextInput] = useState("")
  
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

  const handleConfirm = () => {
    if (requireTextConfirmation && textInput.toLowerCase() !== confirmationKeyword.toLowerCase()) {
      return
    }
    onConfirm()
    setTextInput("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTextInput("")
    }
    onOpenChange(newOpen)
  }

  const isConfirmDisabled = loading || (requireTextConfirmation && textInput.toLowerCase() !== confirmationKeyword.toLowerCase())

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[90vw] w-full sm:max-w-md mx-auto">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
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
          <AlertDialogTitle className="text-lg font-semibold leading-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed break-words">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {requireTextConfirmation && (
          <div className="space-y-2 px-2 sm:px-6">
            <Label htmlFor="confirmation-input" className="text-sm font-medium leading-tight">
              Type <span className="font-mono font-bold text-destructive break-all">{confirmationKeyword}</span> to confirm:
            </Label>
            <Input
              id="confirmation-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Type "${confirmationKeyword}" here...`}
              className="text-center font-mono text-xs sm:text-sm break-all"
              autoComplete="off"
            />
          </div>
        )}
        
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 px-2 sm:px-6">
          <AlertDialogCancel 
            className="w-full sm:w-auto text-sm" 
            disabled={loading}
            onClick={onCancel}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={cn("w-full sm:w-auto text-sm", styles.confirmButtonClass)}
          >
            {loading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}