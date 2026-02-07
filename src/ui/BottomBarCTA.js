import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';

/**
 * BottomBarCTA — sticky bar pinned at screen bottom
 * Props: label, sublabel, onPress, disabled, badge, className
 */
const BottomBarCTA = ({
  label,
  sublabel,
  onPress,
  disabled = false,
  badge,
  className = '',
}) => {
  return (
    <View className={`absolute bottom-0 w-full bg-surface border-t border-border px-5 pt-3 pb-8 ${className}`}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        className={`flex-row items-center justify-between rounded-md py-4 px-5 ${
          disabled ? 'bg-muted/30' : 'bg-primary'
        }`}
      >
        {badge && (
          <View className="bg-primaryDark py-1 px-3 rounded-sm mr-3">
            <Text className="text-white font-extrabold text-base">{badge}</Text>
          </View>
        )}
        <Text className={`flex-1 text-center font-bold text-lg ${disabled ? 'text-muted' : 'text-white'}`}>
          {label}
        </Text>
        {sublabel && (
          <Text className={`font-extrabold text-base ${disabled ? 'text-muted' : 'text-white'}`}>
            {sublabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default BottomBarCTA;
