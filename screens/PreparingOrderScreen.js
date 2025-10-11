import { View, Text, SafeAreaView } from 'react-native'
import React, { useEffect } from 'react'
import * as Animatable from "react-native-animatable"
import { useNavigation } from '@react-navigation/native'
import * as Progress from "react-native-progress";

const PreparingOrderScreen = () => {
    const navigation = useNavigation();

    useEffect(() =>{
        setTimeout(() =>{
            navigation.navigate("Delivery");
        },800)
    },[]);
  return (
    <SafeAreaView className='bg-[#00CCBB] justify-center items-center flex-1'>
        <Animatable.Image
        source={require("../assets/deliveroo.gif")}
        animation="slideInUp"
        iterationCount={1}
        className='h-96 w-96'
        />

        <Animatable.Text
        animation="slideInUp"
        iterationCount={1}
        className='text-lg my-10 text-white font-bold text-center'
        >
            En attente d'acceptation de votre commande par le Restaurant!

        </Animatable.Text>
    
        <Progress.Circle size={60} indeterminate={true} color='white'/>


    </SafeAreaView>
  )
}

export default PreparingOrderScreen