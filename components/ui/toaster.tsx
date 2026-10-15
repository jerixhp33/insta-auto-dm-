"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast, ToastClose, ToastDescription, ToastProvider,
  ToastTitle, ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle, XCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="flex items-start gap-3 flex-1">
            {variant === "success" && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
            {variant === "destructive" && <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            {(!variant || variant === "default") && <Info className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
