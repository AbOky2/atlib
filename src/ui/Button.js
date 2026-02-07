import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import React from 'react';

/**
 * Button — primary / secondary / ghost / danger
 * Props: variant, size, label, loading, disabled, onPress, className, icon
 */
const variants = {
  primary:
    'bg-primary',
  primaryDisabled:
    'bg-primary/40',
  secondary:
    'bg-primarySoft border border-primary/20',
  secondaryDisabled:
    'bg-primarySoft/50 border border-primary/10',
  ghost:
    'bg-transparent',
  ghostDisabled:
    'bg-transparent',
  danger:
    'bg-danger',
  dangerDisabled:
    'bg-danger/40',
};

const textVariants = {
  primary: 'text-white',
  primaryDisabled: 'text-white/60',
  secondary: 'text-primary',
  secondaryDisabled: 'text-primary/40',
  ghost: 'text-primary',
  ghostDisabled: 'text-muted',
  danger: 'text-white',
  dangerDisabled: 'text-white/60',
};

const sizes = {
  sm: 'py-2 px-4',
  md: 'py-3 px-6',
  lg: 'py-4 px-8',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const Button = ({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  disabled = false,
  onPress,
  className = '',
  icon,
}) => {
  const isDisabled = disabled || loading;
  const variantKey = isDisabled ? `${variant}Disabled` : variant;
  const bgClass = variants[variantKey] || variants.primary;
  const txtClass = textVariants[variantKey] || textVariants.primary;
  const sizeClass = sizes[size] || sizes.md;
  const txtSize = textSizes[size] || textSizes.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center rounded-md ${bgClass} ${sizeClass} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? '#7A1E3A' : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && icon}
          <Text className={`font-bold ${txtClass} ${txtSize} ${icon ? 'ml-2' : ''}`}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
