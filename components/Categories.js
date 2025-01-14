import { ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import CategoryCard from './CategoryCard'
import '../global.css'
import sanityClient from '../sanity'

const Categories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    sanityClient.fetch(`*[_type=="category"]`).then((data) => {
        setCategories(data);
    }).catch(console.error);
  }
  , []);


  return (
    <ScrollView horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{
        paddingTop: 10,
        paddingHorizontal : 15,
    }}
    >
      {categories?.map((category) => (
        <CategoryCard
        key={category._id}
        imgUrl={category.image}
        title={category.name}
        />
      ))}
  
    </ScrollView>
  )
}

export default Categories