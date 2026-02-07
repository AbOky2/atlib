import { View, Text } from 'react-native';
import React from 'react';

/**
 * Badge — eta / popular / promo / warning / info / success
 * Props: variant, label, icon, className
 */
const badgeStyles = {
  eta: {
    bg: 'bg-surface border border-border',
    text: 'text-text',
  },
  popular: {
    bg: 'bg-accentSoft border border-accent/20',
    text: 'text-accent',
  },
  promo: {
    bg: 'bg-primarySoft border border-primary/20',
    text: 'text-primary',
  },
  warning: {
    bg: 'bg-accentSoft border border-warning/20',
    text: 'text-warning',
  },
  info: {
    bg: 'bg-info/10 border border-info/20',
    text: 'text-info',
  },
  success: {
    bg: 'bg-success/10 border border-success/20',
    text: 'text-success',
  },
  danger: {
    bg: 'bg-danger/10 border border-danger/20',
    text: 'text-danger',
  },
};

const Badge = ({ variant = 'eta', label, icon, className = '' }) => {
  const style = badgeStyles[variant] || badgeStyles.eta;

  return (
    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${style.bg} ${className}`}>
      {icon && <View className="mr-1">{icon}</View>}
      <Text className={`text-xs font-bold ${style.text}`}>{label}</Text>
    </View>
  );
};

export default Badge;
