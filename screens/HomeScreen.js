import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import '../global.css'
import { useNavigation } from '@react-navigation/native'
import { ChevronDownIcon, BellIcon, XMarkIcon } from 'react-native-heroicons/outline'
import Categories from '../components/Categories'
import FeaturedRow from '../components/FeaturedRow'
import FilterPill from '../components/FilterPill'
import FilterModal from '../components/FilterModal'
import RestaurantListCard from '../components/RestaurantListCard'
import sanityClient from '../sanity'
import { useDispatch, useSelector } from 'react-redux'
import { selectCurrentAddress } from '../features/addressSlice'
import { selectCurrentOrder } from '../features/orderSlice'
import {
  setCategory, togglePickup, toggleOffers,
  setPriceLevel, setMaxDeliveryFee, resetFilters,
  selectActiveCategory,
  selectPickupOnly, selectOffersOnly,
  selectPriceLevel, selectMaxDeliveryFee,
  selectHasActiveFilters,
} from '../features/filtersSlice'
import { loadFavorites } from '../features/favoritesSlice'
import {
  mockRestaurants, CATEGORIES,
  PRICE_LEVELS, DELIVERY_FEE_PRESETS,
} from '../src/data/mockRestaurants'

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [deliveryFeeModalVisible, setDeliveryFeeModalVisible] = useState(false);

  const activeCategory = useSelector(selectActiveCategory);
  const pickupOnly = useSelector(selectPickupOnly);
  const offersOnly = useSelector(selectOffersOnly);
  const priceLevel = useSelector(selectPriceLevel);
  const maxDeliveryFee = useSelector(selectMaxDeliveryFee);
  const hasActiveFilters = useSelector(selectHasActiveFilters);
  const currentAddress = useSelector(selectCurrentAddress);
  const currentOrder = useSelector(selectCurrentOrder);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => { dispatch(loadFavorites()); }, []);

  useEffect(() => {
    sanityClient.fetch(`*[_type=="featured"]{
      ...,
      restaurants[] ->{ ..., dishes[] ->, type->{ name } }
    }`).then(setFeaturedCategories).catch(console.error);
  }, []);

  const filteredRestaurants = useMemo(() => {
    let results = mockRestaurants.filter(
      (r) => r.topTab === 'all' || !r.topTab,
    );
    if (activeCategory) results = results.filter((r) => r.categories.includes(activeCategory));
    if (pickupOnly) results = results.filter((r) => r.services.pickup);
    if (offersOnly) results = results.filter((r) => r.activeOffers);
    if (priceLevel) results = results.filter((r) => r.priceLevel <= priceLevel);
    if (maxDeliveryFee !== null) results = results.filter((r) => r.deliveryFeeXaf <= maxDeliveryFee);
    return results;
  }, [activeCategory, pickupOnly, offersOnly, priceLevel, maxDeliveryFee]);

  const showFilteredList = hasActiveFilters;

  const handleCategory = useCallback((catId) => dispatch(setCategory(catId)), [dispatch]);

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => c.id !== 'courses' && c.id !== 'alcohol'),
    [],
  );

  return (
    <SafeAreaView className="bg-surface flex-1">
      {/* ═══ Header ═══ */}
      <View className="px-4 pt-1 pb-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.navigate('Address')}
            className="flex-row items-center flex-1"
            activeOpacity={0.7}
          >
            <Text className="text-base font-bold text-text" numberOfLines={1}>
              {currentAddress.zone || 'Lieu actuel'}
            </Text>
            <ChevronDownIcon size={16} color="#111827" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <View className="relative">
            <TouchableOpacity
              className="p-2 rounded-full"
              activeOpacity={0.7}
            >
              <BellIcon size={24} color="#111827" />
            </TouchableOpacity>
            {currentOrder && currentOrder.status !== 'DELIVERED' && (
              <View className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-danger rounded-full border border-surface" />
            )}
          </View>
        </View>
      </View>

      {/* ═══ Filter Rows ═══ */}
      <View className="pb-2">
        {/* Row 1: Category icons */}
        {visibleCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}
          >
            {visibleCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleCategory(cat.id)}
                  className="items-center mr-5"
                  activeOpacity={0.7}
                  style={{ width: 80 }}
                >
                  <View className={`h-20 w-20 rounded-2xl items-center justify-center mb-1.5 ${
                    isActive ? 'bg-primarySoft border border-primary/30' : 'bg-bg border border-border'
                  }`}>
                    <Text style={{ fontSize: 32 }}>{cat.emoji}</Text>
                  </View>
                  <Text className={`text-xs font-semibold text-center ${
                    isActive ? 'text-primary' : 'text-text'
                  }`} numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Row 2: Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          <FilterPill
            label="À emporter"
            isSelected={pickupOnly}
            onPress={() => dispatch(togglePickup())}
          />
          <FilterPill
            label="Offres"
            isSelected={offersOnly}
            onPress={() => dispatch(toggleOffers())}
          />
          <FilterPill
            label={priceLevel ? `Prix ${'$'.repeat(priceLevel)}` : 'Prix'}
            isDropdown
            isSelected={priceLevel !== null}
            onPress={() => setPriceModalVisible(true)}
          />
          <FilterPill
            label={
              maxDeliveryFee !== null
                ? maxDeliveryFee === 0 ? 'Gratuit' : `≤${maxDeliveryFee} XAF`
                : 'Frais de livraison'
            }
            isDropdown
            isSelected={maxDeliveryFee !== null}
            onPress={() => setDeliveryFeeModalVisible(true)}
          />
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => dispatch(resetFilters())}
              activeOpacity={0.7}
              className="flex-row items-center bg-danger/10 border border-danger/20 rounded-full px-3 py-2.5 mr-2"
            >
              <XMarkIcon size={14} color="#EF4444" />
              <Text className="text-danger font-semibold text-sm ml-1">Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Info line like Uber Eats */}
      <View className="px-4 pb-2">
        <Text className="text-xs text-muted">
          Découvrez comment les résultats sont classés.{' '}
          <Text className="underline text-text">En savoir plus.</Text>
        </Text>
      </View>

      {/* Divider */}
      <View className="h-px bg-border" />

      {/* ═══ Body ═══ */}
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {showFilteredList ? (
          <View className="pt-4">
            <Text className="text-sm font-medium text-muted px-4 mb-3">
              {filteredRestaurants.length} résultat{filteredRestaurants.length !== 1 ? 's' : ''}
            </Text>
            {filteredRestaurants.length === 0 ? (
              <View className="items-center py-20 px-8">
                <Text className="text-4xl mb-4">🔍</Text>
                <Text className="text-muted text-center text-base">
                  Aucun restaurant ne correspond à vos filtres.
                </Text>
              </View>
            ) : (
              filteredRestaurants.map((r) => (
                <RestaurantListCard key={r.id} restaurant={r} />
              ))
            )}
          </View>
        ) : (
          <>
            <Categories />
            {featuredCategories?.map((category) => (
              <FeaturedRow
                key={category._id}
                id={category._id}
                title={category.name}
                description={category.short_description}
                restaurants={category.restaurants}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* ═══ Modals ═══ */}
      <FilterModal
        visible={priceModalVisible}
        onClose={() => setPriceModalVisible(false)}
        title="Filtrer par prix"
        selected={priceLevel}
        onSelect={(val) => dispatch(setPriceLevel(val))}
        options={PRICE_LEVELS.map((p) => ({ value: p.level, label: p.label, sublabel: p.description }))}
      />
      <FilterModal
        visible={deliveryFeeModalVisible}
        onClose={() => setDeliveryFeeModalVisible(false)}
        title="Frais de livraison max"
        selected={maxDeliveryFee}
        onSelect={(val) => dispatch(setMaxDeliveryFee(val))}
        options={DELIVERY_FEE_PRESETS.map((d) => ({ value: d.max, label: d.label }))}
      />
    </SafeAreaView>
  );
};

export default HomeScreen
