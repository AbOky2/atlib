'widget';

import React from 'react';
import { View, Text } from 'react-native';

export default function OrderTrackingLiveActivity() {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#7A1E3A' }}>Atlib - Commande</Text>
        <Text style={{ fontSize: 14, color: '#333333' }}>En préparation...</Text>
      </View>
      <View style={{ width: 40, height: 40, backgroundColor: '#7A1E3A', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: 20 }}>📦</Text>
      </View>
    </View>
  );
}
