import { View, Text, TextInput } from 'react-native';
import React from 'react';

/**
 * Input — labelled text input with helper / error
 * Props: label, placeholder, value, onChangeText, helper, error, className, ...rest
 */
const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  helper,
  error,
  className = '',
  ...rest
}) => {
  const borderClass = error
    ? 'border-danger'
    : 'border-border focus:border-primary';

  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text className="text-sm font-semibold text-text mb-1.5">{label}</Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        className={`bg-surface border ${borderClass} rounded-sm px-4 py-3 text-base text-text`}
        {...rest}
      />
      {error ? (
        <Text className="text-xs text-danger mt-1">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-muted mt-1">{helper}</Text>
      ) : null}
    </View>
  );
};

export default Input;
