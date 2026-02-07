import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native'
import React from 'react'

/**
 * FilterModal — lightweight bottom-sheet style modal for filter selection.
 * Props:
 *   visible, onClose, title,
 *   options: [{ value, label, sublabel? }],
 *   selected (current value),
 *   onSelect (value) => void
 */
const FilterModal = ({ visible, onClose, title, options = [], selected, onSelect }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface rounded-t-xl px-4 pt-4 pb-8"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-text">{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text className="text-primary font-semibold">Fermer</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between p-4 mb-2 rounded-md border ${
                  isSelected
                    ? 'bg-primarySoft border-primary/30'
                    : 'bg-bg border-border'
                }`}
              >
                <View>
                  <Text className={`font-semibold text-base ${isSelected ? 'text-primary' : 'text-text'}`}>
                    {opt.label}
                  </Text>
                  {opt.sublabel && (
                    <Text className="text-muted text-sm mt-0.5">{opt.sublabel}</Text>
                  )}
                </View>
                {isSelected && (
                  <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default FilterModal
