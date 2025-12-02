import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DonateFoodScreen({ navigation }) {
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [isPerishable, setIsPerishable] = useState("No");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDark = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadDark();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const border = darkMode ? "#555" : "#ddd";
  const nextBtnBg = "#A27571";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Donate Food</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Category"
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
        />

        
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Quantity"
          placeholderTextColor="#999"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Enter pickup Address"
          placeholderTextColor="#999"
          value={address}
          onChangeText={setAddress}
        />

        
        <Text style={[styles.label, { color: text }]}>Is Perishable</Text>
        <TouchableOpacity style={[styles.dropdown, { backgroundColor: inputBg, borderColor: border }]}>
          <Text style={[styles.dropdownText, { color: text }]}>{isPerishable}</Text>
          <Ionicons name="chevron-down" size={20} color={text} />
        </TouchableOpacity>

       
        <Text style={[styles.label, { color: text }]}>
          Take pictures of the Donated Item
        </Text>
        <Text style={[styles.hint, { color: "#999" }]}>
          Please Make sure to show the Expiration Date
        </Text>

        <TouchableOpacity style={[styles.imagePickerBox, { borderColor: border }]}>
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>

    
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: nextBtnBg }]}>
          <Text style={styles.nextText}>next</Text>
        </TouchableOpacity>
      </ScrollView>

    
      <View style={styles.footerContainer}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.footerLogo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: "400",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  dropdown: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dropdownText: {
    fontSize: 15,
  },
  imagePickerBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  plus: {
    fontSize: 32,
    color: "#A27571",
    fontWeight: "300",
  },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 40,
  },
  nextText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  footerContainer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
});
