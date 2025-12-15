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
import AsyncStorage from "@react-native-async-storage/async-storage";
const OPENAI_API_KEY = "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";
const ASSISTANT_ID = "asst_vmzyZiX3S8mxG7Zvka3nNAEW";

const openaiHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  "OpenAI-Beta": "assistants=v2",
};

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

  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};
  const [user, setUser] = useState({
    user_id,
    username,
    email,
    full_name,
    phone,
    role,
    address,
  });

  useEffect(() => {
    const initializeUser = async () => {
      try {
        if (user_id) {
          try {
            const res = await axios.get(`${API.API_URL}/accounts/${user_id}`);
            if (res && res.data) {
              setUser(res.data);
              await AsyncStorage.setItem("user_data", JSON.stringify(res.data));
            }
          } catch (err) {
            console.log("Error fetching user from API:", err.message || err);
          }
          return;
        }

        const savedUserData = await AsyncStorage.getItem("user_data");
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          setUser(userData);
          console.log("Loaded user from AsyncStorage:", userData);
          return;
        }

        console.log("No user data available");
      } catch (err) {
        console.log("Error initializing user:", err.message || err);
      }
    };

    initializeUser();
  }, []);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) setDarkMode(saved === "true");
      } catch (e) {}
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

  const callZaadBot = async (text, user) => {
  try {
    const threadRes = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      { headers: openaiHeaders }
    );
    const threadId = threadRes.data.id;

    
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        role: "user",
        content: text,
        metadata: {
          donor_id: user?.user_id?.toString() || "",
          location: user?.address || "",
        },
      },
      { headers: openaiHeaders }
    );

    let runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      { headers: openaiHeaders }
    );

    let run = runRes.data;
    while (
      run.status === "queued" ||
      run.status === "in_progress" ||
      run.status === "requires_action"
    ) {
      if (run.status === "requires_action") {
        const calls = run.required_action.submit_tool_outputs.tool_calls;
        const tool_outputs = [];

        for (const call of calls) {
          if (call.function.name === "getRecommendations") {
            const args = JSON.parse(call.function.arguments);

            const donation_type = args.donation_type;
            const donor_id = args.donor_id || user?.user_id;
            const location = args.location || user?.address;

            const resApi = await axios.get(`${API.API_URL}/recommend`, {
              params: { donation_type, donor_id, location },
            });

            tool_outputs.push({
              tool_call_id: call.id,
              output: JSON.stringify(resApi.data),
            });
          }
        }

        const submit = await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/submit_tool_outputs`,
          { tool_outputs },
          { headers: openaiHeaders }
        );

        run = submit.data;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const poll = await axios.get(
          `https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`,
          { headers: openaiHeaders }
        );
        run = poll.data;
      }
    }

    const msgs = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: openaiHeaders }
    );

    const assistantMsg = msgs.data.data.find((m) => m.role === "assistant");

    return assistantMsg?.content?.[0]?.text?.value || "No response.";

  } catch (err) {
    console.log("ZaadBot Error:", err.response?.data || err.message);
    return "Error contacting ZaadBot.";
  }
};


  const sendMessage = async () => {
  if (!input.trim()) return;

  const userMessage = {
    id: Date.now().toString(),
    sender: "user",
    text: input,
  };

  setMessages((prev) => [...prev, userMessage]);
  const messageToSend = input;
  setInput("");

  const botReply = await callZaadBot(messageToSend, user);

  const botMessage = {
    id: Date.now().toString() + "b",
    sender: "bot",
    text: botReply,
  };

  setMessages((prev) => [...prev, botMessage]);
  flatListRef.current?.scrollToEnd({ animated: true });
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
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={{ width: 45 }} />

        <Image
          source={require("../assets/images/ZaadBot1.png")}
          style={styles.headerLogo}
        />

        <TouchableOpacity onPress={openSidebar}>
          <Image
            source={require("../assets/menu.png")}
            style={[styles.menuIcon, { tintColor: menuTint }]}
          />
        </TouchableOpacity>
      </View>

      {/* MESSAGES */}
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

      {/* INPUT */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: headerBg, borderColor: inputBorder },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: inputBg,
              color: inputText,
              borderColor: inputBorder,
            },
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
        sourceScreen="ChatBotScreen"
        darkMode={darkMode}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 40,
  },

  headerLogo: {
    width: 100,
    height: 30,
    resizeMode: "contain",
  },

  menuIcon: {
    width: 45,
    height: 45,
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
    borderBottomRightRadius: 0,
    opacity: 0.85,
  },

  botBubble: {
    borderBottomLeftRadius: 0,
  },

  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    paddingBottom: 30,
  },

  input: {
    flex: 1,
    padding: 12,
    borderRadius: 25,
    paddingHorizontal: 20,
    borderWidth: 1,
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
