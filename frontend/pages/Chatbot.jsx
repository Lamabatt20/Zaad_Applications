import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API from "../config";
import SideMenu from "../components/SideMenu";

export default function ChatBotScreen({ navigation, route }) {
  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "bot",
      text: "Hello! I’m ZaadBot. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const flatListRef = useRef();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
  const { user_id, username, email, full_name, phone, role, address } = route?.params || {};
  const [user, setUser] = useState({ user_id, username, email, full_name, phone, role, address });

  useEffect(() => {
    // If user_id provided via navigation, fetch latest user data from backend
    const fetchUser = async () => {
      if (!user_id) return;
      try {
        const res = await axios.get(`${API.API_URL}/accounts/${user_id}`);
        if (res && res.data) setUser(res.data);
      } catch (err) {
        console.log('Error fetching user for Chatbot:', err.message || err);
      }
    };

    fetchUser();
  }, [user_id]);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) setDarkMode(saved === "true");
      } catch (e) {
        
      }
    };
    loadTheme();
    const unsubscribe = navigation?.addListener?.("focus", loadTheme);
    return unsubscribe;
  }, [navigation]);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const headerBg = bg;
  const textColor = darkMode ? "#fff" : "#333";
  const menuTint = darkMode ? "#fff" : "#5A3D36";
  const personIconColor = darkMode ? "#fff" : "#A27571";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const inputText = darkMode ? "#fff" : "#000";
  const inputBorder = darkMode ? "#444" : "#A27571";
  const botTextColor = darkMode ? "#fff" : "#333";
  const botBubbleBg = "#A27571";
  const userBubbleBg = "#C6AAA3";

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setTimeout(() => {
      const botMessage = {
        id: Date.now().toString() + "b",
        sender: "bot",
        text: "This is a sample reply from ZaadBot",
      };

      setMessages((prev) => [...prev, botMessage]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 600);
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === "user";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userContainer : styles.botContainer,
        ]}
      >
        {isUser ? (
          <Ionicons
            name="person-circle-outline"
            size={36}
            color={personIconColor}
            style={{ marginLeft: 6 }}
          />
        ) : (
          <Image
            source={require("../assets/images/zaadbot.png")}
            style={styles.botIcon}
          />
        )}

        <View style={{ flexDirection: "column" }}>
          <View
            style={[
              styles.messageBubble,
              isUser
                ? [styles.userBubble, { backgroundColor: userBubbleBg }]
                : [styles.botBubble, { backgroundColor: botBubbleBg }],
            ]}
          >
            <Text style={{ color: isUser ? "#fff" : botTextColor }}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      
      <View style={styles.header}>
        {/* left placeholder so logo stays centered */}
        <View style={{ width: 45 }} />

        <Image
          source={require("../assets/images/ZaadBot1.png")}
          style={styles.headerLogo}
        />

        <TouchableOpacity onPress={openSidebar}>
          <Image
            source={require("../assets/menu.png")}
            style={styles.menuIcon}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 20 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: headerBg, borderColor: inputBorder },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: inputBg, color: inputText, borderColor: inputBorder },
          ]}
          placeholder="Type your message..."
          placeholderTextColor={darkMode ? "#aaa" : "#888"}
          value={input}
          onChangeText={setInput}
        />

        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>➤</Text>
        </TouchableOpacity>
      </View>
      <SideMenu
        visible={sidebarOpen}
        onClose={closeSidebar}
        navigation={navigation}
        user={user}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE1D7",
  },

  header: {
    height: 70,
    backgroundColor: "#EBE1D7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 40,
  },

  headerIcon: {
    width: 30,
    height: 30,
    tintColor: "#5A3D36",
  },

  headerLogo: {
    width: 100,
    height: 30,
    resizeMode: "contain",
  },

  messageContainer: {
    flexDirection: "row",
    marginVertical: 6,
    maxWidth: "80%",
    paddingTop: 16,
  },

  userContainer: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },

  botContainer: {
    alignSelf: "flex-start",
  },

  botIcon: {
    width: 32,
    height: 32,
    marginRight: 6,
    borderRadius: 16,
  },

  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },

  userBubble: {
    backgroundColor: "#C6AAA3",
    borderBottomRightRadius: 0,
    opacity: 0.85,
  },

  botBubble: {
    backgroundColor: "#A27571",
    borderBottomLeftRadius: 0,
  },

  userText: {
    color: "#fff",
  },

  botText: {
    color: "#333",
  },

  menuIcon: {
    width: 45,
    height: 45,
  },

  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#EBE1D7",
    borderTopWidth: 1,
    borderColor: "#A27571",
    paddingBottom: 30,
  },

  input: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 20,
  },

  sendButton: {
    width: 45,
    height: 45,
    marginLeft: 8,
    backgroundColor: "#A27571",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});