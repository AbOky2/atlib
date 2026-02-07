import { View } from 'react-native';
import React from 'react';

/**
 * Card — a consistent surface container
 * Props: children, className, padded
 */
const Card = ({ children, className = '', padded = true }) => {
  return (
    <View
      className={`bg-surface rounded-md border border-border ${padded ? 'p-4' : ''} ${className}`}
    >
      {children}
    </View>
  );
};

export default Card;
