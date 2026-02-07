import { Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { ChevronDownIcon } from 'react-native-heroicons/outline'

const FilterPill = ({ label, icon, isDropdown, isSelected, onPress, image }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className={`flex-row items-center rounded-full px-4 py-2.5 mr-2 border ${
                isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
            }`}
        >
            {image && <Image source={{ uri: image }} className="h-4 w-4 mr-2" />}
            <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-text'}`}>
                {label}
            </Text>
            {isDropdown && (
                <ChevronDownIcon
                    size={14}
                    color={isSelected ? '#FFFFFF' : '#6B7280'}
                    style={{ marginLeft: 4 }}
                />
            )}
        </TouchableOpacity>
    )
}

export default FilterPill
