import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';

/**
 * Chip — selected / unselected toggle pill
 * Props: label, selected, onPress, icon, className
 */
const Chip = ({ label, selected = false, onPress, icon, className = '' }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center px-4 py-2.5 rounded-full mr-2 ${
        selected
          ? 'bg-primary'
          : 'bg-surface border border-border'
      } ${className}`}
    >
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text
        className={`font-semibold text-sm ${
          selected ? 'text-white' : 'text-text'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default Chip;
