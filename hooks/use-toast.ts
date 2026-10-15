"use client";

import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

interface Toast extends Omit<ToastProps, "id"> {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastList: Toast[] = [];

function emitChange(toasts: Toast[]) {
  toastList = toasts;
  toastListeners.forEach((listener) => listener(toasts));
}

let counter = 0;
function genId() {
  return `toast-${++counter}`;
}

export function toast(props: Omit<Toast, "id">) {
  const id = genId();
  const newToast: Toast = { ...props, id };
  emitChange([...toastList, newToast]);

  setTimeout(() => {
    emitChange(toastList.filter((t) => t.id !== id));
  }, 5000);

  return { id };
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>(toastList);

  React.useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  return {
    toasts,
    toast,
    dismiss: (id: string) => emitChange(toastList.filter((t) => t.id !== id)),
  };
}
