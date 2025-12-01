import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DonateClothesScreen() {
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [condition, setCondition] = useState("New");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDark = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadDark();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#000";
  const inputBg = darkMode ? "#2a2a2a" : "transparent";
  const border = darkMode ? "#888" : "rgba(0,0,0,0.2)";
  const box = darkMode ? "#3a3a3a" : "#E9D8C5";
  const nextBtnBg = darkMode ? "#444" : "#A27571";

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: bg }]}>
      
      <Text style={[styles.title, { color: text }]}>Donate Clothes</Text>

      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
        placeholder="Category"
        placeholderTextColor={darkMode ? "#bbb" : "#3A2A20"}
        value={category}
        onChangeText={setCategory}
      />

      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
        placeholder="Quantity"
        placeholderTextColor={darkMode ? "#bbb" : "#3A2A20"}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]}
        placeholder="Description"
        placeholderTextColor={darkMode ? "#bbb" : "#3A2A20"}
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
        placeholder="Enter pickup Address"
        placeholderTextColor={darkMode ? "#bbb" : "#3A2A20"}
        value={address}
        onChangeText={setAddress}
      />

      <Text style={[styles.sectionLabel, { color: text }]}>Condition</Text>
      <TouchableOpacity style={[styles.dropdown, { borderColor: border }]}>
        <Text style={[styles.dropdownText, { color: text }]}>{condition}</Text>
        <Text style={[styles.arrow, { color: text }]}>⌄</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { color: text }]}>
        Take pictures of the Donated Item
      </Text>

      <TouchableOpacity style={[styles.imageBox, { backgroundColor: box, borderColor: border }]}>
        <Text style={[styles.plus, { color: darkMode ? "#ccc" : "#A27571" }]}> + </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.nextBtn, { backgroundColor: nextBtnBg }]}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>

      <View style={styles.footerContainer}>
        <Image
          source={require('../assets/images/Z A A D.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 70,
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
    marginTop: 30,
  },
  sectionLabel: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  dropdown: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 18,
  },
  imageBox: {
    width: 80,
    height: 80,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  plus: {
    fontSize: 34,
  },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 25,
  },
  nextText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  footerContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
});
