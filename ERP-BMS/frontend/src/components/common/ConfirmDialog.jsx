import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
      <div 
        className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className={cn(
          "p-6 border-b border-border/50",
          isDanger ? "bg-destructive/5" : "bg-primary/5"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-2.5 rounded-xl flex-shrink-0",
              isDanger ? "bg-destructive/10" : "bg-primary/10"
            )}>
              {isDanger ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground leading-tight">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 pt-0">
            <button
              onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-all active:scale-[0.98] border border-border/50"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] shadow-sm hover:shadow-md",
              isDanger
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            >
              {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
