import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'dish',
  title: 'Dish',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      title: 'Name of the Dish',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'short_description',
      type: 'string',
      title: 'Short description',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'price',
      type: 'number',
      title: 'Price of the Dish',
    }),
    defineField({
      name: 'image',
      type: 'image',
      title: 'Image of the Dish',
    }),
  ],
})