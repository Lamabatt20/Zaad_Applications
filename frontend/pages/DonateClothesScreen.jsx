import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";

export default function DonateClothesScreen() {
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [condition, setCondition] = useState("New");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      
      <Text style={styles.title}>Donate Clothes</Text>

      
      <TextInput
        style={styles.input}
        placeholder="Category"
        placeholderTextColor="#3A2A20"
        value={category}
        onChangeText={setCategory}
      />

     
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        placeholderTextColor="#3A2A20"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

     
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        placeholderTextColor="#3A2A20"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      
      <TextInput
        style={styles.input}
        placeholder="Enter pickup Address"
        placeholderTextColor="#3A2A20"
        value={address}
        onChangeText={setAddress}
      />

     
      <Text style={styles.sectionLabel}>Condition</Text>
      <TouchableOpacity style={styles.dropdown}>
        <Text style={styles.dropdownText}>{condition}</Text>
        <Text style={styles.arrow}>⌄</Text>
      </TouchableOpacity>

     
      <Text style={styles.sectionLabel}>Take pictures of the Donated Item</Text>
      <TouchableOpacity style={styles.imageBox}>
        <Text style={styles.plus}> + </Text>
      </TouchableOpacity>

     
      <TouchableOpacity style={styles.nextBtn}>
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
    backgroundColor: "#EBE1D7",
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
    marginTop:30,
    color: "#000000",
  },

  sectionLabel: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  input: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
     borderColor: "rgba(0,0,0,0.2)", 
    borderWidth: 1,
    color: "#333",
  },

  textArea: {
    height: 90,
    textAlignVertical: "top",
  },

  dropdown: {
    backgroundColor: "transparent",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)", 
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownText: {
    fontSize: 16,
    color: "#000",
  },

  arrow: {
    fontSize: 18,
    color: "#000",
  },

  imageBox: {
    width: 80,
    height: 80,
    backgroundColor: "#E9D8C5",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D0C0B2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  plus: {
    fontSize: 34,
    color: "#A27571",
  },

  nextBtn: {
    backgroundColor: "#A27571",
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
