import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Download01Icon,
  Mail01Icon, 
  CheckmarkCircle02Icon, 
  AlertCircleIcon, 
  Loading03Icon, 
  File01Icon, 
  UserIcon,
  ReloadIcon
} from '@hugeicons/core-free-icons';

export type ReportActionType = 'download' | 'email';

export type ReportProgressStage = 
  | 'idle' 
  | 'preparing' 
  | 'capturing' 
  | 'packaging' 
  | 'transmitting' 
  | 'saving' 
  | 'success' 
  | 'error';

export interface ReportProgressState {
  isOpen: boolean;
  action: ReportActionType; // 'download' | 'email'
  stage: ReportProgressStage;
  progress: number; // 0 - 100
  currentPage?: number;
  totalPages?: number;
  recipientEmail?: string;
  patientName?: string;
  staffId?: string;
  filename?: string;
  statusTitle?: string;
  statusDescription?: string;
  errorMessage?: string;
}

interface SingleReportProgressModalProps {
  state: ReportProgressState;
  onClose: () => void;
  onRetry?: () => void;
}

export const SingleReportProgressModal: React.FC<SingleReportProgressModalProps> = ({
  state,
  onClose,
  onRetry,
}) => {
  const {
    isOpen,
    action = 'download',
    stage,
    progress,
    currentPage = 1,
    totalPages = 4,
    recipientEmail = '',
    patientName = '',
    staffId = '',
    filename = '',
    statusTitle,
    statusDescription,
    errorMessage,
  } = state;

  const isEmail = action === 'email';
  const isSuccess = stage === 'success';
  const isError = stage === 'error';
  const isInProgress = !isSuccess && !isError && stage !== 'idle';

  // Define steps based on action type
  const steps = isEmail
    ? [
        {
          id: 'preparing',
          label: 'Document Preparation',
          description: 'Validating recipient & initializing DOM layout',
          isCompleted: ['capturing', 'packaging', 'transmitting', 'success'].includes(stage),
          isActive: stage === 'preparing',
        },
        {
          id: 'capturing',
          label: 'Page Layout Capture',
          description: stage === 'capturing' 
            ? `Rendering Page ${currentPage} of ${totalPages} (High-Res 3x)...` 
            : 'Converting HTML canvas & high-density layout',
          isCompleted: ['packaging', 'transmitting', 'success'].includes(stage),
          isActive: stage === 'capturing',
        },
        {
          id: 'packaging',
          label: 'PDF Binary Compilation',
          description: 'Packaging vector fonts & Base64 attachment',
          isCompleted: ['transmitting', 'success'].includes(stage),
          isActive: stage === 'packaging',
        },
        {
          id: 'transmitting',
          label: 'SMTP Mail Delivery',
          description: isSuccess 
            ? `Dispatched successfully to ${recipientEmail}` 
            : `Connecting to SMTP mail server...`,
          isCompleted: stage === 'success',
          isActive: stage === 'transmitting',
          isFailed: isError && stage === 'error',
        },
      ]
    : [
        {
          id: 'preparing',
          label: 'Document Preparation',
          description: 'Validating patient records & DOM layout structure',
          isCompleted: ['capturing', 'packaging', 'saving', 'success'].includes(stage),
          isActive: stage === 'preparing',
        },
        {
          id: 'capturing',
          label: 'Page Layout Capture',
          description: stage === 'capturing' 
            ? `Rendering Page ${currentPage} of ${totalPages} (High-Res 3x)...` 
            : 'Converting vector charts & high-density layout',
          isCompleted: ['packaging', 'saving', 'success'].includes(stage),
          isActive: stage === 'capturing',
        },
        {
          id: 'packaging',
          label: 'PDF Binary Compilation',
          description: 'Assembling pixel-perfect PDF document binary',
          isCompleted: ['saving', 'success'].includes(stage),
          isActive: stage === 'packaging',
        },
        {
          id: 'saving',
          label: 'Device Download',
          description: isSuccess 
            ? `Saved ${filename} to your device` 
            : `Writing PDF binary to device downloads folder...`,
          isCompleted: stage === 'success',
          isActive: stage === 'saving',
          isFailed: isError && stage === 'error',
        },
      ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing during active progress
      if (!open && !isInProgress) {
        onClose();
      }
    }}>
      <DialogContent 
        className="max-w-md w-[92vw] sm:w-full rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden"
        hideClose={isInProgress}
      >
        <div className="p-6 sm:p-7 space-y-6">
          
          {/* Header Graphic & Title */}
          <div className="flex flex-col items-center text-center space-y-3 pt-1">
            {isSuccess ? (
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-in zoom-in-75 duration-300">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-9 h-9" />
              </div>
            ) : isError ? (
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/10 animate-in zoom-in-75 duration-300">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-9 h-9" />
              </div>
            ) : (
              <div className="relative w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                <HugeiconsIcon 
                  icon={isEmail ? Mail01Icon : Download01Icon} 
                  className="w-8 h-8 animate-pulse text-primary" 
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <HugeiconsIcon icon={Loading03Icon} className="w-3.5 h-3.5 text-primary-foreground animate-spin" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {isSuccess 
                  ? (isEmail ? "Report Emailed Successfully!" : "Report Downloaded Successfully!")
                  : isError 
                    ? (statusTitle || (isEmail ? "Email Delivery Failed" : "Download Failed"))
                    : (statusTitle || (isEmail ? "Emailing Medical Report" : "Generating PDF Report"))}
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-[320px] mx-auto leading-relaxed">
                {isSuccess
                  ? (isEmail 
                      ? "The medical report PDF has been dispatched and delivered to the recipient address."
                      : "The high-resolution medical report PDF has been compiled and saved to your device.")
                  : isError
                    ? "An error occurred during report generation or file processing."
                    : (statusDescription || (isEmail 
                        ? "Generating high-resolution PDF and transmitting via secure SMTP server..."
                        : "Rendering pixel-perfect pages and compiling PDF for download..."))}
              </p>
            </div>
          </div>

          {/* Patient & Summary Info Card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-foreground truncate">{patientName || 'Patient'}</span>
                {staffId && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black tracking-wide shrink-0">
                    {staffId}
                  </span>
                )}
              </div>
            </div>

            {isEmail && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                <span className="truncate font-semibold text-foreground/90">
                  {recipientEmail || 'No recipient email configured'}
                </span>
              </div>
            )}

            {filename && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 truncate">
                <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{filename}</span>
              </div>
            )}
          </div>

          {/* In-Progress View: Progress Bar & Multi-Step Checklist */}
          {isInProgress && (
            <div className="space-y-4">
              {/* Progress Bar Header */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Overall Progress</span>
                  <span className="text-primary font-black">{Math.min(100, Math.max(0, Math.round(progress)))}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
                  <div 
                    className="h-full bg-gradient-to-r from-primary via-indigo-600 to-primary rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                  />
                </div>
              </div>

              {/* Step Checklist */}
              <div className="space-y-2 pt-1 text-left">
                {steps.map((step, idx) => (
                  <div 
                    key={step.id} 
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                      step.isActive 
                        ? 'bg-primary/5 border-primary/30 shadow-xs' 
                        : step.isCompleted 
                          ? 'bg-muted/20 border-border/40 opacity-90' 
                          : 'bg-muted/10 border-border/20 opacity-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {step.isCompleted ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" />
                        </div>
                      ) : step.isActive ? (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                          <HugeiconsIcon icon={Loading03Icon} className="w-3.5 h-3.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${step.isActive ? 'text-primary' : step.isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success View */}
          {isSuccess && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 shrink-0" />
                  <span>{isEmail ? "Delivery Confirmed via SMTP" : "File Saved to Device"}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEmail ? (
                    <>The medical report PDF attachment was compiled and dispatched to <strong className="text-foreground">{recipientEmail}</strong>.</>
                  ) : (
                    <>The pixel-perfect medical report PDF <strong className="text-foreground">{filename}</strong> has been downloaded to your device storage.</>
                  )}
                </p>
              </div>

              <Button
                onClick={onClose}
                className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all"
              >
                Done
              </Button>
            </div>
          )}

          {/* Error View */}
          {isError && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 shrink-0" />
                  <span>Error Details</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed break-words font-medium">
                  {errorMessage || (isEmail 
                    ? "Failed to send email. Please check internet connection, recipient email, and SMTP credentials." 
                    : "Failed to generate or download PDF report.")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    className="flex-1 h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2"
                  >
                    <HugeiconsIcon icon={ReloadIcon} className="w-4 h-4" />
                    <span>Try Again</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl font-bold border-2 hover:bg-muted"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};

// Backward-compatible alias export for SingleReportEmailModal
export const SingleReportEmailModal = SingleReportProgressModal;
export type EmailProgressState = ReportProgressState;
