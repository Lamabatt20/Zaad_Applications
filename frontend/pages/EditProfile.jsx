import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import config from '../config';
import axios from "axios";


export default function EditProfileScreen({ route, navigation }) {
  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};

  const [editUsername, setEditUsername] = useState(username || "");
  const [editFullName, setEditFullName] = useState(full_name || "");
  const [editPhone, setEditPhone] = useState(phone || "");
  const [editAddress, setEditAddress] = useState(address || "");

  const updateAccount = async () => {
  try {
    const response = await axios.put(
      `${config.API_URL}/accounts/user/${user_id}`,
      {
        username: editUsername,
        full_name: editFullName,
        phone: editPhone,
        address: editAddress,
        email,
        role,
      }
    );

    alert("Profile updated successfully!");

    navigation.navigate({
      name: "ProfileScreen",
      params: {
        username: editUsername,
        full_name: editFullName,
        phone: editPhone,
        address: editAddress,
        email,
        role,
      },
      merge: true,
    });

  } catch (error) {
    console.log(error);
    if (error.response) {
      alert(error.response.data.message || "Update failed");
    } else {
      alert("Error updating account");
    }
  }
};
  return (
    <LinearGradient
      colors={["#A27571", "#FFDAB4", "rgba(162,117,113,0)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Image
          source={require("../assets/images/back.png")}
          style={{ width: 28, height: 28, resizeMode: "contain" }}
        />
      </TouchableOpacity>

      
      <TouchableOpacity
        style={styles.chatbotBtn}
        onPress={() => navigation.navigate("ChatBotScreen")}
      >
        <Image
          source={require("../assets/images/zaadbot.png")}
          style={{ width: 40, height: 40, resizeMode: "contain" }}
        />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileCard}>
        
          <View style={styles.profileImageContainer}>
             <Image
            source={require("../assets/images/profiles.png")} style={{ width: 125,
            height: 110,}} />
            <TouchableOpacity style={styles.editIconBtn} onPress={updateAccount}>
              <Ionicons name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          
          <View style={styles.fieldBox}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={editUsername}
              onChangeText={setEditUsername}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={styles.label}>Fullname</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={editAddress}
              onChangeText={setEditAddress}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity style={styles.passwordBtn} 
          onPress={() => navigation.navigate("ChangePassword", {
            user_id,
            username: editUsername,
            email,
            full_name: editFullName,
            phone: editPhone,
            address: editAddress,
            role,
            })}
          >
            <Text style={styles.passwordBtnText}>Change Password</Text>
            <Ionicons
              name="lock-closed"
              size={17}
              color="#fff"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },

  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 20,
  },

  chatbotBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
  },

  profileCard: {
    backgroundColor: "#EBE1D7",
    marginTop: 170,
    marginHorizontal: 0,
    padding: 25,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingBottom: 60,
    minHeight: "100%",
  },

  profileImageContainer: {
    alignItems: "center",
    marginTop: -90,
  },

  editIconBtn: {
    backgroundColor: "#000",
    width: 30,
    height: 30,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 120,
    top: 65,
  },

  fieldBox: {
    marginTop: 15,
  },

  label: {
    fontSize: 13,
    color: "#8b6f69",
    marginBottom: 5,
  },

  input: {
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 15,
    backgroundColor: "#EBE1D7",
  },

  passwordBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 240,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  passwordBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
