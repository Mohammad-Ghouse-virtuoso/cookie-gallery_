/**
 * Optimized Image Component with:
 * - WebP support with JPEG fallback
 * - Responsive srcset for different screen sizes
 * - Lazy loading with Intersection Observer
 * - Blur placeholder effect
 * - Error handling
 */

import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // Load immediately without lazy loading
  sizes?: string; // Responsive sizes attribute
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate srcset for responsive images
  const generateSrcSet = (imageSrc: string) => {
    // If already optimized WebP, return as-is
    if (imageSrc.includes('/optimized/')) {
      return imageSrc;
    }

    // Extract filename without extension
    const filename = imageSrc.split('/').pop()?.split('.')[0] || '';
    
    return [
      `/images/optimized/${filename}-small.webp 300w`,
      `/images/optimized/${filename}-medium.webp 600w`,
      `/images/optimized/${filename}-large.webp 1200w`
    ].join(', ');
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const currentRef = imgRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Placeholder while loading
  if (!shouldLoad) {
    return (
      <div
        ref={imgRef}
        className={`bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
        style={{ width, height, aspectRatio: width && height ? `${width}/${height}` : undefined }}
      />
    );
  }

  // Error state
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <picture>
      {/* WebP with srcset for responsive sizes */}
      <source
        type="image/webp"
        srcSet={generateSrcSet(src)}
        sizes={sizes}
      />
      {/* Fallback to original */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: width && height ? `${width}px ${height}px` : undefined
        }}
      />
    </picture>
  );
}
