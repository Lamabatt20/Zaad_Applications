import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

export default function DecisionScreen({ route, navigation }) {
  const userName = route?.params?.userName || "Donor";

  return (
    <View style={styles.container}>
      
      {/* LOGO + WELCOME */}
      <View style={styles.header}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <Text style={styles.welcome}>Welcome {userName}</Text>
       {/* PROFILE PICTURE */}
        <TouchableOpacity style={styles.profileContainer}>
          <Image 
            source={require("../assets/profile.png")} 
            style={styles.profilePic} 
          />
        </TouchableOpacity>
      </View>

      {/* CHOOSE TYPE */}
      <Text style={styles.title}>Choose Donation Type:</Text>

      <View style={styles.box}>
        
        {/* Clothes Donation */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ClothesAssociationsScreen")}
        >
          <Image source={require("../assets/cloth2.png")} style={styles.icon} />
          <Text style={styles.optionText}>Clothes Donation</Text>
        </TouchableOpacity>

        {/* Food Donation */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("FoodScreen")}
        >
          <Image source={require("../assets/food2.png")} style={styles.icon} />
          <Text style={styles.optionText}>Food Donation</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5E9DD",
    alignItems: "center",
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 130,
    height: 70,
    resizeMode: "contain",
  },
  welcome: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 10,
    color: "#8B5E3C",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
 profileContainer: {
    position: "absolute",
    top: 0,
    right: 10,
    borderRadius: 25,
    overflow: "hidden",
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  option: {
    alignItems: "center",
    marginVertical: 10,
  },
  icon: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  optionText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
  },
});
