import React, { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className, 
  fallbackText,
  ...props 
}) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/20 text-muted-foreground text-xs font-bold text-center px-2 border border-dashed border-muted-foreground/20 rounded-lg`}>
        {fallbackText || alt || 'Image Not Found'}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)} 
      {...props} 
    />
  );
};
