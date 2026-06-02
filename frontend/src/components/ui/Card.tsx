import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
    return (
        <div
            className={`
        bg-white rounded-xl shadow-md overflow-hidden
        ${hover ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardImageProps {
    src: string;
    alt: string;
    className?: string;
}

export function CardImage({ src, alt, className = '' }: CardImageProps) {
    return (
        <div className={`relative h-48 overflow-hidden ${className}`}>
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
        </div>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}
