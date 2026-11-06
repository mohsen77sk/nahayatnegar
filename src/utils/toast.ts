export interface ToastOptions {
  message: string;
  type?: "success" | "error";
  duration?: number;
}

// Render <Toast /> once in the page layout, then call this from any client script.
export function showToast({ message, type = "success", duration = 6000 }: ToastOptions) {
  document.dispatchEvent(new CustomEvent<ToastOptions>("app:toast", { detail: { message, type, duration } }));
}
