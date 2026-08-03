import { Text, PressableProps, Pressable } from "react-native";

export interface ButtonProps extends PressableProps {
    label: string;
    variant?: "default" | "outline" | "ghost";
}

export function Button({ label, variant = "default", className, ...props }: ButtonProps) {
    const baseClasses = "rounded-full py-4 px-6 items-center justify-center flex-row active:scale-[0.98]";
    const variantClasses = {
        default: "bg-primary active:bg-primary/90",
        outline: "border-2 border-primary bg-transparent active:bg-primary/5",
        ghost: "bg-transparent active:bg-surface-variant",
    };

    const textClasses = {
        default: "text-on-primary font-labelbold text-base",
        outline: "text-primary font-labelbold text-base",
        ghost: "text-primary font-labelbold text-base",
    };

    return (
        <Pressable className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            <Text className={textClasses[variant]}>{label}</Text>
        </Pressable>
    );
}
