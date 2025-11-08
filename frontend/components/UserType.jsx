import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function UserType({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo1.png')} 
        style={styles.logoTop}
        resizeMode="contain"
      />


      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate('RegisterForDonor')}
        >
          <Image
            source={require('../assets/images/donor 1.png')} 
            style={styles.icon}
          />
          <Text style={styles.optionText}>Donor</Text>
           
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate('RegisterForAssociation')}
        >
          <Image
            source={require('../assets/images/ass.png')} 
            style={styles.icon}
             
          />
          <Text style={styles.optionText}>Association</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomLogoContainer}>
              <Image
                source={require('../assets/images/Z A A D.png')}
                style={styles.logoBottom}
              />
            </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBE1D7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoTop: {
    width: 120,
    height: 120,
    marginBottom: 200,
  },
  title: {
    fontSize: 18,
    marginBottom: 30,
    color: '#000000',
    fontWeight: '600',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  option: {
    alignItems: 'center',
    padding: 20,
    marginBottom:300,
  },
  icon: {
    width: 110,
    height: 110,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  bottomLogoContainer: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  logoBottom: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
});
