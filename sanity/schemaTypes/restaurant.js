import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'restaurant',
  title: 'Restaurant',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      title: 'Restaurant Name',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'short_description',
      type: 'string',
      title: 'Short description',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      title: 'Image of the Restaurant',
    }),
    defineField({
      name: 'lat',
      type: 'number',
      title: 'Latitude of the Restaurant',
    }),
    defineField({
      name: 'long',
      type: 'number',
      title: 'Longitude of the Restaurant',
    }),
    defineField({
      name: 'address',
      type: 'string',
      title: 'Address of the Restaurant',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'rating',
      type: 'number',
      title: 'Rating of the Restaurant',
      validation: Rule => Rule.required().min(1).max(5),
    }),
    defineField({
      name: 'type',
      type: 'reference',
      title: 'Category',
      to: [{ type: 'category' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'dishes',
      type: 'array',
      title: 'Dishes',
      of: [{ type: 'reference', to: [{ type: 'dish' }] }],
    }),
  ],
})