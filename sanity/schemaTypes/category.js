import {defineField, defineType} from 'sanity'

export default {
  name: 'category',
  title: 'Menu Category',
  type: 'document',
  fields: [
    {
      name: 'name',
      type: 'string',
      title : 'Category name',
      validation: Rule => Rule.max(200),
    },
    {
      name: 'image',
      type: 'image',
      title : 'Image of the Category',
    },
  ],
}
