import { View, Text, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeftIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline'
import { StarIcon } from 'react-native-heroicons/solid'
import { useSelector } from 'react-redux'
import { selectOrderHistory } from '../features/orderSlice'
import { mockRestaurants, CATEGORIES } from '../src/data/mockRestaurants'

const SearchScreen = () => {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const orderHistory = useSelector(selectOrderHistory);

  // Recent restaurants from order history
  const recentRestaurants = useMemo(() => {
    const seen = new Set();
    return orderHistory
      .filter((o) => {
        if (seen.has(o.restaurantId || o.restaurantName)) return false;
        seen.add(o.restaurantId || o.restaurantName);
        return true;
      })
      .slice(0, 4)
      .map((o) => ({
        id: o.restaurantId,
        name: o.restaurantName,
        image: o.restaurantImage,
      }));
  }, [orderHistory]);

  // Live search results
  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return mockRestaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.short_description.toLowerCase().includes(q) ||
        r.cuisineTags.some((t) => t.includes(q)) ||
        r.categories.some((c) => c.includes(q))
    );
  }, [query]);

  const handleRestaurantPress = (restaurant) => {
    navigation.navigate('Restaurant', {
      id: restaurant.id,
      imgUrl: null,
      title: restaurant.name,
      rating: restaurant.rating,
      genre: restaurant.cuisineTags?.[0] || '',
      address: restaurant.address,
      short_description: restaurant.short_description,
      dishes: restaurant.dishes || [],
      long: 0,
      lat: 0,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* ── Search Header ── */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-3 p-1"
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-bg border border-border rounded-full px-4 h-11">
          <MagnifyingGlassIcon size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un restaurant, un plat..."
            placeholderTextColor="#6B7280"
            autoFocus
            className="flex-1 ml-2 text-base text-text"
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Search Results ── */}
        {query.length >= 2 ? (
          <View className="pt-4">
            {searchResults.length === 0 ? (
              <View className="items-center py-16 px-8">
                <Text className="text-4xl mb-3">🔍</Text>
                <Text className="text-muted text-center text-base">
                  Aucun résultat pour "{query}"
                </Text>
              </View>
            ) : (
              searchResults.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => handleRestaurantPress(r)}
                  activeOpacity={0.7}
                  className="flex-row items-center px-4 py-3 border-b border-border"
                >
                  <Image
                    source={{ uri: r.imageUrl }}
                    className="h-14 w-14 rounded-md bg-bg mr-3"
                  />
                  <View className="flex-1">
                    <Text className="text-base font-bold text-text">{r.name}</Text>
                    <Text className="text-sm text-muted mt-0.5" numberOfLines={1}>
                      {r.short_description}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-accentSoft px-2 py-0.5 rounded-full">
                    <StarIcon size={12} color="#C8A24A" />
                    <Text className="text-xs font-bold text-accent ml-1">{r.rating}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* ── Default: Recent + Categories ── */
          <>
            {/* Recent Orders */}
            {recentRestaurants.length > 0 && (
              <View className="px-4 pt-5 pb-2">
                <Text className="text-lg font-bold text-text mb-4">Commandez à nouveau</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {recentRestaurants.map((r, idx) => (
                    <TouchableOpacity
                      key={r.id || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        const full = mockRestaurants.find((mr) => mr.id === r.id);
                        if (full) handleRestaurantPress(full);
                      }}
                      className="items-center mr-5"
                    >
                      <Image
                        source={{ uri: r.image }}
                        className="h-16 w-16 rounded-full bg-bg border-2 border-border"
                      />
                      <Text className="text-xs font-semibold text-text mt-2 text-center w-16" numberOfLines={2}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Browse Categories */}
            <View className="px-4 pt-6">
              <Text className="text-lg font-bold text-text mb-4">Meilleures catégories</Text>
              {CATEGORIES.filter((c) => !['courses', 'alcohol', 'boissons', 'desserts'].includes(c.id))
                .map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      navigation.goBack();
                      // small delay to let navigation complete then set filter
                      setTimeout(() => {
                        const { setCategory } = require('../features/filtersSlice');
                        const { store } = require('../store');
                        store.dispatch(setCategory(cat.id));
                      }, 100);
                    }}
                    className="flex-row items-center py-3.5 border-b border-border"
                  >
                    <View className="h-10 w-10 bg-primarySoft rounded-full items-center justify-center mr-3">
                      <Text className="text-lg">{cat.emoji}</Text>
                    </View>
                    <Text className="text-base font-semibold text-text flex-1">{cat.label}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            {/* Popular Suggestions */}
            <View className="px-4 pt-6 pb-8">
              <Text className="text-lg font-bold text-text mb-4">Suggestions populaires</Text>
              <View className="flex-row flex-wrap">
                {['Shawarma', 'Pizza', 'Brochettes', 'Burger', 'Jus frais', 'Kisra'].map((term) => (
                  <TouchableOpacity
                    key={term}
                    onPress={() => setQuery(term)}
                    activeOpacity={0.7}
                    className="bg-bg border border-border rounded-full px-4 py-2.5 mr-2 mb-2"
                  >
                    <Text className="text-sm font-medium text-text">{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchScreen
