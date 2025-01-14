 import sanityClient from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const client = sanityClient({
    projectId: 'cq9tdpib',
    dataset : 'production',
    useCdn: true,
    apiVersion: '2021-10-21',
})

const builder = imageUrlBuilder(client);

export const urlFor = (source) => {
    return builder.image(source);
}
//Executez la commande pour ajouter une exception de sécurité pour le site Web de votre projet Sanity:
//cors localhost:3000
//sanity cors add http://localhost:3000

export default client;