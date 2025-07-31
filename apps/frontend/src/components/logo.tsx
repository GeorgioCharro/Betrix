import { Download } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  url: string;
  className?: string;
  children: React.ReactNode;
}

interface LogoImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

interface LogoTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

interface LogoBrandDownloadProps {
  children: React.ReactNode;
  files: {
    name: string;
    path: string;
    format: 'svg' | 'png' | 'jpg' | 'jpeg' | 'webp';
  }[];
  className?: string;
}

function LogoBrandDownload({
  children,
  files,
  className,
}: LogoBrandDownloadProps): JSX.Element {
  const handleDownload = async (
    file: LogoBrandDownloadProps['files'][0]
  ): Promise<void> => {
    try {
      const response = await fetch(file.path);
      if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent fail
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn('inline-block', className)}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {files.map(file => (
          <ContextMenuItem
            className="cursor-pointer"
            key={file.path}
            onClick={() => void handleDownload(file)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download {file.format.toUpperCase()}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function Logo({ url, className, children, ...props }: LogoProps): JSX.Element {
  return (
    <a
      className={cn('flex max-h-8 items-center gap-2', className)}
      href={url}
      {...props}
    >
      {children}
    </a>
  );
}

function LogoImage({
  src,
  alt,
  className,
  ...props
}: LogoImageProps): JSX.Element {
  return (
    <img
      alt={alt}
      className={cn('block h-8', className)}
      src={src}
      {...props}
    />
  );
}

function LogoImageMobile({
  src,
  alt,
  className,
  ...props
}: LogoImageProps): JSX.Element {
  return (
    <img
      alt={alt}
      className={cn('flex h-8 md:hidden', className)}
      src={src}
      {...props}
    />
  );
}

function LogoImageDesktop({
  src,
  alt,
  className,
  ...props
}: LogoImageProps): JSX.Element {
  return (
    <img
      alt={alt}
      className={cn('hidden h-8 md:flex', className)}
      src={src}
      {...props}
    />
  );
}

function LogoText({
  children,
  className,
  ...props
}: LogoTextProps): JSX.Element {
  return (
    <span
      className={cn('text-lg font-semibold tracking-tighter', className)}
      {...props}
    >
      {children}
    </span>
  );
}

function LogoTextMobile({
  children,
  className,
  ...props
}: LogoTextProps): JSX.Element {
  return (
    <span
      className={cn(
        'text-lg font-semibold tracking-tighter md:hidden',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

function LogoTextDesktop({
  children,
  className,
  ...props
}: LogoTextProps): JSX.Element {
  return (
    <span
      className={cn(
        'hidden text-lg font-semibold tracking-tighter md:flex',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export {
  Logo,
  LogoBrandDownload,
  LogoImage,
  LogoImageDesktop,
  LogoImageMobile,
  LogoText,
  LogoTextDesktop,
  LogoTextMobile,
};
