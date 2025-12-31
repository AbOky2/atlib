import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect } from 'react'
import * as Animatable from "react-native-animatable"
import { useNavigation } from '@react-navigation/native'
import * as Progress from "react-native-progress";

const PreparingOrderScreen = () => {
    const navigation = useNavigation();

    useEffect(() => {
        setTimeout(() => {
            navigation.navigate("Delivery");
        }, 4000)
    }, []);
    return (
        <SafeAreaView className='bg-[#F59E0B] justify-center items-center flex-1'>
            <Animatable.Image
                source={require("../assets/deliveroo.gif")}
                animation="slideInUp"
                iterationCount={1}
                className='h-80 w-80'
            />

            <Animatable.Text
                animation="slideInUp"
                iterationCount={1}
                className='text-xl my-10 text-white font-bold text-center px-4 leading-8'
            >
                En attente de confirmation du restaurant...
            </Animatable.Text>

            <Progress.Circle size={60} indeterminate={true} color='white' borderWidth={2} />

            <Text className="text-white/80 mt-4 text-sm font-medium">Veuillez patienter...</Text>
        </SafeAreaView>
    )
}

export default PreparingOrderScreen