import { View, Text, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import Currency from '../utils/formatCurrency'
import { urlFor } from '../sanity'
import { MinusCircleIcon, PlusCircleIcon } from 'react-native-heroicons/solid'
import { useDispatch, useSelector } from 'react-redux'
import { addToBasket, removeFromBasket, selectBasketItemsWithId } from '../features/basketSlice'

const DishRow = ({ id, name, description, price, image }) => {
    const [isPressed, setIsPressed] = useState(false);
    const dispatch = useDispatch();
    const items = useSelector((state) => selectBasketItemsWithId(state, id));
    const addItemsToBasket = () => {
        dispatch(addToBasket({ id, name, description, price, image }));
    };

    const removeItemFromBasket = () => {
        if (!items.length > 0) return;
        dispatch(removeFromBasket({ id }))
    }

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setIsPressed(!isPressed)}
                className={`bg-surface border border-border p-4 rounded-md mb-2 ${isPressed && 'border-primary/30 bg-primarySoft/20'}`}
            >
                <View className="flex-row items-center">
                    <View className="flex-1 pr-3">
                        <Text className="text-base font-bold text-text mb-1">{name}</Text>
                        <Text className="text-muted text-sm leading-5" numberOfLines={2}>{description}</Text>
                        <Text className="text-primary mt-2 font-bold text-base">
                            <Currency quantity={price} currency="USD" />
                        </Text>
                    </View>
                    <Image
                        source={{ uri: urlFor(image).url() }}
                        className="h-20 w-20 rounded-sm bg-bg object-cover"
                    />
                </View>
            </TouchableOpacity>

            {isPressed && (
                <View className="bg-primarySoft/30 px-4 py-3 rounded-b-md -mt-2 mb-2 border border-t-0 border-primary/20">
                    <View className="flex-row items-center justify-center">
                        <TouchableOpacity
                            disabled={!items.length}
                            onPress={removeItemFromBasket}
                            activeOpacity={0.7}
                        >
                            <MinusCircleIcon
                                size={32}
                                color={items.length > 0 ? '#7A1E3A' : '#E5E7EB'}
                            />
                        </TouchableOpacity>

                        <Text className="text-text font-bold text-lg mx-4 w-6 text-center">
                            {items.length}
                        </Text>

                        <TouchableOpacity onPress={addItemsToBasket} activeOpacity={0.7}>
                            <PlusCircleIcon size={32} color="#7A1E3A" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </>
    )
}

export default DishRow
