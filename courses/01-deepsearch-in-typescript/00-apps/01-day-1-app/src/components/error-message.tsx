import { AlertCircle, X } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorMessage = ({ message, onDismiss }: ErrorMessageProps) => {
  return (
    <div className="mx-auto w-full max-w-[65ch]">
      <div className="flex items-center gap-2 rounded-md bg-red-950 p-3 text-sm text-red-300 relative">
        <AlertCircle className="size-5 shrink-0" />
        <span className="flex-1">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-300 hover:text-red-100 focus:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};
