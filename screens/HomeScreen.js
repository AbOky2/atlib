import { View, Text } from 'react-native'
import React, { useLayoutEffect } from 'react'
import '../global.css'
import { useNavigation } from '@react-navigation/native'
const HomeScreen = () => {
    const navigation = useNavigation();
    useLayoutEffect(() => { 
        navigation.setOptions({ 
            headerShown: false,
         }) 
    }, [])

  return (
    <View>
      <Text className="text-red-500">HomeScreen abcde</Text>
    </View>
  )
}

export default HomeScreen