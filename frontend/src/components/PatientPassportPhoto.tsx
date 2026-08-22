import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { EyeIcon, UserIcon, Camera01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PatientPassportPhotoProps {
  src?: string | null;
  alt?: string;
  patientName?: string;
  staffId?: string;
  fallbackText?: string;
  fallbackIcon?: any;
  className?: string;
  imageClassName?: string;
  shape?: 'circle' | 'rounded';
  canChange?: boolean;
  canRemove?: boolean;
  onChangePhoto?: () => void;
  onRemovePhoto?: () => void;
  onPhotoClick?: () => void;
}

export const PatientPassportPhoto: React.FC<PatientPassportPhotoProps> = ({
  src,
  alt = 'Passport Photo',
  patientName,
  staffId,
  fallbackText,
  fallbackIcon: FallbackIcon = UserIcon,
  className,
  imageClassName,
  shape = 'rounded',
  canChange = false,
  canRemove = false,
  onChangePhoto,
  onRemovePhoto,
  onPhotoClick,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const hasPhoto = Boolean(src && src.trim() !== '');

  const normalizedSrc = hasPhoto && src
    ? src.startsWith('http') || src.startsWith('blob') || src.startsWith('data')
      ? src
      : `${(window as any).API_BASE_URL || ''}${src}`
    : '';

  const shapeContainerClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const shapeImageClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <>
      <div
        className={cn(
          'relative group overflow-hidden select-none shrink-0 flex items-center justify-center bg-muted/40 border border-primary/20',
          shapeContainerClass,
          className
        )}
        onClick={(e) => {
          if (onPhotoClick) {
            e.stopPropagation();
            onPhotoClick();
          } else if (hasPhoto) {
            e.stopPropagation();
            setIsPreviewOpen(true);
          }
        }}
      >
        {hasPhoto ? (
          <>
            <img
              src={normalizedSrc}
              alt={alt}
              className={cn('w-full h-full object-cover', shapeImageClass, imageClassName)}
            />

            {/* Desktop Hover Overlay with Preview */}
            <div
              className={cn(
                'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-1.5 z-10',
                shapeContainerClass
              )}
            >
              <button
                type="button"
                className="p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition-all active:scale-95 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                title="Preview photo"
              >
                <HugeiconsIcon icon={EyeIcon} className="text-white h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {canChange && onChangePhoto && (
                <button
                  type="button"
                  className="p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition-all active:scale-95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangePhoto();
                  }}
                  title="Change photo"
                >
                  <HugeiconsIcon icon={Camera01Icon} className="text-white h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              )}

              {canRemove && onRemovePhoto && (
                <button
                  type="button"
                  className="p-1.5 sm:p-2 rounded-full bg-red-500/70 hover:bg-red-500 text-white backdrop-blur-xs transition-all active:scale-95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto();
                  }}
                  title="Remove photo"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="text-white h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              )}
            </div>

            {/* Mobile Top-Right Preview Button */}
            <button
              type="button"
              className="sm:hidden absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/30 backdrop-blur-xs transition-all shadow-md z-10 active:scale-90"
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(true);
              }}
              title="Preview photo"
            >
              <HugeiconsIcon icon={EyeIcon} className="h-3 w-3 text-white" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary font-bold">
            {fallbackText ? (
              <span className="uppercase text-xs font-black">{fallbackText}</span>
            ) : (
              <HugeiconsIcon icon={FallbackIcon} className="h-1/2 w-1/2 text-primary/40" />
            )}
          </div>
        )}
      </div>

      {/* Pop-up Preview Dialog */}
      {hasPhoto && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Camera01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    {patientName ? `${patientName}'s Photo` : 'Passport Photo'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {staffId ? `Staff ID: ${staffId}` : 'Full size preview of the passport photograph'}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center p-4 sm:p-6 bg-muted/20">
              <img
                src={normalizedSrc}
                alt={alt}
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 p-4 bg-muted/40 border-t">
              {canChange && onChangePhoto && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-bold gap-2"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    onChangePhoto();
                  }}
                >
                  <HugeiconsIcon icon={Camera01Icon} className="h-4 w-4" />
                  Change Photo
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                className="font-bold"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
