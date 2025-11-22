import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

export default function DonateClothesScreen() {
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [condition, setCondition] = useState("New");

  const handleSubmit = () => {
    // For now, just log the values
    console.log({ category, quantity, description, address, condition });
    alert("Form submitted! Check console log.");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Donate Clothes</Text>

      <Text style={styles.label}>   </Text>
      <TextInput
        style={styles.input}
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
      />

      <Text style={styles.label}>  </Text>
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 90 }]}
        placeholder="Description"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}></Text>
      <TextInput
        style={styles.input}
        placeholder="Enter pickup Address"
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>Condition</Text>
      <TouchableOpacity style={styles.dropdown}>
        <Text>{condition}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Donate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5E9DD",
    padding: 15,
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#8B5E3C",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    elevation: 2,
  },
  dropdown: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#8B5E3C",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 15,
  },
  submitText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
});
