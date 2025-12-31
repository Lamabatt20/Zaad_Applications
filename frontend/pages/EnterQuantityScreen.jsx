import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EnterQuantityScreen({ navigation, route }) {
	const initial = route?.params?.quantity ?? "";
	const [quantity, setQuantity] = useState(String(initial));
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

	const handleNext = () => {
		const value = quantity === "" ? null : quantity;
		if (route?.params?.onComplete && typeof route.params.onComplete === "function") {
			route.params.onComplete({ quantity: value });
			navigation.goBack();
			return;
		}
		const nextScreen = route?.params?.nextScreen || "DonateFood";
		navigation.navigate(nextScreen, { quantity: value });
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: bg }]}> 
			<View style={[styles.header, { borderBottomColor: border }]}> 
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="chevron-back" size={28} color={text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: text }]}>Enter Quantity</Text>
				<View style={{ width: 28 }} />
			</View>

			<View style={styles.content}>
				<Text style={[styles.label, { color: text }]}>Quantity</Text>
				<TextInput
					style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
					placeholder="Enter quantity (e.g. 3, 5)"
					placeholderTextColor="#999"
					value={quantity}
					onChangeText={setQuantity}
					keyboardType="default"
				/>

				<TouchableOpacity style={[styles.nextBtn, { backgroundColor: nextBtnBg }]} onPress={handleNext}>
					<Text style={styles.nextText}>Next</Text>
				</TouchableOpacity>
			</View>

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
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	headerTitle: { fontSize: 20, fontWeight: "700" },
	content: { padding: 20 },
	label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
	input: {
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 15,
		marginBottom: 12,
		borderWidth: 1,
	},
	nextBtn: { paddingVertical: 14, borderRadius: 10, marginTop: 10 },
	nextText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },
	footerContainer: { position: "absolute", bottom: 10, width: "100%", alignItems: "center" },
	footerLogo: { width: 80, height: 80, resizeMode: "contain" },
});
