import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableOpacity } from 'react-native';

export default function SplashScreen({ navigation }) { 
  const logo1Opacity = useRef(new Animated.Value(1)).current;
  const logo2Opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    
    Animated.sequence([
      Animated.timing(logo1Opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(logo1Opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(logo2Opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();

    
    const timer = setTimeout(() => {
      navigation.navigate('Login');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/images/logo1.png')}
        style={[styles.logo1, { opacity: logo1Opacity, position: 'absolute' }]}
        resizeMode="contain"
      />

      <Animated.View style={{ opacity: logo2Opacity, alignItems: 'center' }}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.Text style={[styles.subtitle, { opacity: textOpacity }]}>
          <Text style={styles.title}>قال رسول الله ﷺ{'\n'}</Text>
          (مَن كان معه فضلُ زادٍ فلْيعُدْ به على مَن لا زادَ له)
        </Animated.Text>

       
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBE1D7', justifyContent: 'center', alignItems: 'center' ,paddingHorizontal: 20},
  logo: { width: 410, height: 410, marginBottom: 10, marginRight: 55 },
  logo1: { width: 150, height: 150 },
  subtitle: { fontSize: 18, color: '#A27571', textAlign: 'center' },
  title: { fontWeight: 'bold', fontSize: 18 },
});
