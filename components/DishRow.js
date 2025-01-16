import { View, Text, Touchable, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import Currency from 'react-currency-formatter'
import { urlFor } from '../sanity'
import { MinusCircleIcon, PlusCircleIcon } from 'react-native-heroicons/solid'
import { useDispatch, useSelector } from 'react-redux'
import { addToBasket, removeFromBasket, selectBasketItemsWithId } from '../features/basketSlice'

const DishRow = ({id, name, description, price, image}) => {
    const [isPressed, setIsPressed] = useState(false);
    const dispatch = useDispatch();
    const items = useSelector((state) => selectBasketItemsWithId(state,id));
    const addItemsToBasket = () => {
        // dispatch the item into the data layer
        dispatch(addToBasket({id, name, description, price, image}));
    };

    const removeItemFromBasket = () =>{
        if(!items.length > 0) return;
        dispatch(removeFromBasket({id}))
    }

  return (
    
    <>
    <TouchableOpacity
    onPress={() => {
        setIsPressed(!isPressed)}}
     className={`bg-white border-gray-200 border p-4 ${isPressed && 'border-b-0'}`}>
        <View className='flex-row'>
            <View className='flex-1 pr-2 '>
                <Text className='text-lg mb-1'>{name}</Text>
                <Text className='text-gray-400'>{description}</Text>
                <Text className='text-gray-400 mt-2'>
                    <Currency quantity={price} currency="USD" />
                </Text>
            </View>
            <View>
                <Image source={{uri: urlFor(image).url()}} 
                style={{borderWidth: 1, borderColor: '#f3f3f4'}}
                className='h-20 w-20 rounded bg-gray-300  ' />
            </View>
        </View>
    </TouchableOpacity>
    {isPressed && (
        <View className='bg-white px-4'>
            <View className='flex-row items-center space-x-2 gap-2 pb-3'>
                <TouchableOpacity disabled={!items.length} onPress={removeItemFromBasket}>
                    <MinusCircleIcon size={40} color={items.length > 0 ? "#00CCBB" : "gray"} />
                </TouchableOpacity>
                
                <Text>{items.length}</Text>

                <TouchableOpacity onPress={addItemsToBasket}>
                    <PlusCircleIcon  size={40} color="#00CCBB" />
                </TouchableOpacity>
            </View>

        </View>)}
    </>
    
  )
}

export default DishRow