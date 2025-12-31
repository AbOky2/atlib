import { View, Text, SafeAreaView } from 'react-native'
import React, { useEffect } from 'react'
import * as Animatable from "react-native-animatable"
import { useNavigation } from '@react-navigation/native'
import * as Progress from "react-native-progress";

const PreparingOrderScreen = () => {
    const navigation = useNavigation();

    useEffect(() => {
        setTimeout(() => {
            navigation.navigate("Delivery");
        }, 4000) // Increased time to enjoy the animation
    }, []);
    return (
        <SafeAreaView className='bg-[#00CCBB] justify-center items-center flex-1'>
            <Animatable.Image
                source={require("../assets/deliveroo.gif")}
                animation="slideInUp"
                iterationCount={1}
                className='h-80 w-80'
            />

            <Animatable.Text
                animation="slideInUp"
                iterationCount={1}
                className='text-lg my-10 text-white font-bold text-center px-4'
            >
                Waiting for Restaurant to accept your order!
            </Animatable.Text>

            <Progress.Circle size={60} indeterminate={true} color='white' borderWidth={2} />
        </SafeAreaView>
    )
}

export default PreparingOrderScreen