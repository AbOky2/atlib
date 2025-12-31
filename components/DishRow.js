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
                className={`bg-white border p-4 border-gray-100 ${isPressed && 'border-b-0'}`}>
                <View className='flex-row items-center'>
                    <View className='flex-1 pr-2'>
                        <Text className='text-lg mb-1 font-semibold text-gray-800'>{name}</Text>
                        <Text className='text-gray-500 text-sm leading-5'>{description}</Text>
                        <Text className='text-gray-900 mt-2 font-bold'>
                            <Currency quantity={price} currency="USD" />
                        </Text>
                    </View>
                    <View>
                        <Image source={{ uri: urlFor(image).url() }}
                            className='h-24 w-24 rounded-xl bg-gray-200 object-cover' />
                    </View>
                </View>
            </TouchableOpacity>
            {isPressed && (
                <View className='bg-white px-4 pt-2 pb-4'>
                    <View className='flex-row items-center space-x-3 pb-2'>
                        <TouchableOpacity
                            disabled={!items.length}
                            onPress={removeItemFromBasket}
                            activeOpacity={0.7}>
                            <MinusCircleIcon size={35} color={items.length > 0 ? "#F59E0B" : "#E5E7EB"} />
                        </TouchableOpacity>

                        <Text className="text-gray-700 font-bold text-lg w-6 text-center">{items.length}</Text>

                        <TouchableOpacity onPress={addItemsToBasket} activeOpacity={0.7}>
                            <PlusCircleIcon size={35} color="#F59E0B" />
                        </TouchableOpacity>
                    </View>
                </View>)}
        </>
    )
}

export default DishRow