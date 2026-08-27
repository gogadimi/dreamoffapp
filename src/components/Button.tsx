import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'action' | 'secondary' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export default function Button({ children, className, variant = 'primary', ...props }: ButtonProps) {
    const baseStyles = "rounded-lg font-serif px-6 py-3 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95";

    const variants = {
        primary: "bg-surface border border-border text-primary shadow-glow hover:bg-surfaceLight hover:shadow-[0_0_20px_rgba(191,167,111,0.5)]",
        action: "bg-[#800000] text-[#E9D8A6] border border-[#800000] hover:bg-[#600000] shadow-[0_0_15px_rgba(128,0,0,0.4)]",
        secondary: "bg-transparent border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200",
        icon: "p-3 rounded-full aspect-square border border-border bg-surface hover:bg-surfaceLight shadow-glow"
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
}
