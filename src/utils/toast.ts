export interface ToastOptions {
  message: string;
  title?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
}

// Render <Toast /> once in the page layout, then call this from any client script.
export function showToast({ message, title, type = "success", duration = 6000 }: ToastOptions) {
  document.dispatchEvent(new CustomEvent<ToastOptions>("app:toast", { detail: { message, title, type, duration } }));
}
