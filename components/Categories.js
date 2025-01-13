import { ScrollView } from 'react-native'
import React from 'react'
import CategoryCard from './CategoryCard'
import '../global.css'

const Categories = () => {
  return (
    <ScrollView horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{
        paddingTop: 10,
        paddingHorizontal : 15,
    }}
    >
        {/* Categories Cards */}
        <CategoryCard
         imgUrl="https://links.papareact.com/gn7"
        title="Testing"
        />
         <CategoryCard
         imgUrl="https://links.papareact.com/gn7"
        title="Testing"
        />
         <CategoryCard
         imgUrl="https://links.papareact.com/gn7"
        title="Testing"
        />
         <CategoryCard
         imgUrl="https://links.papareact.com/gn7"
        title="Testing"
        />
        <CategoryCard
         imgUrl="https://links.papareact.com/gn7"
        title="Testing"
        />
         <CategoryCard
         imgUrl="https://links.papareact.com/gn7"
        title="Testing"
        />


    </ScrollView>
  )
}

export default Categories