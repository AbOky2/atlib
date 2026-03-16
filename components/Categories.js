import { ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import CategoryCard from './CategoryCard'
import '../global.css'
import { supabase } from '../src/lib/supabase'

const Categories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')

        if (error) throw error
        setCategories(data || [])
      } catch (err) {
        console.error('Error fetching categories from Supabase:', err)
      }
    }

    fetchCategories()
  }, []);


  return (
    <ScrollView horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: 10,
        paddingHorizontal: 15,
      }}
    >
      {categories?.map((category) => (
        <CategoryCard
          key={category.id}
          imgUrl={category.image_url}
          title={category.name}
        />
      ))}

    </ScrollView>
  )
}

export default Categories