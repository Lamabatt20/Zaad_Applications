import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import config from "../config";

export default function DonationRating({ navigation, route }) {
  const donationId = route?.params?.donationId;
  const donorId = route?.params?.donorId;

  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (!donationId || !donorId) {
      Alert.alert(
        "Missing data",
        "donationId / donorId is missing. Open this screen from donation details."
      );
    }
  }, [donationId, donorId]);

  const animateMessage = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.98);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRating = (val) => {
    setRating(val);
    animateMessage();
  };

  const getFeedbackMessage = () => {
    switch (rating) {
      case 1:
        return "We’re sorry it wasn’t good. We’ll improve immediately 💛";
      case 2:
        return "Thanks for the feedback. We’ll do better next time.";
      case 3:
        return "Good! Your feedback helps us grow 🙂";
      case 4:
        return "Great! We’re happy you had a good experience ⭐";
      case 5:
        return "Perfect! Thank you for supporting Zaad 🌟";
      default:
        return "How was your donation experience?";
    }
  };

  const submitRating = async () => {
    try {
      if (!donationId || !donorId) return;

      if (!rating) {
        Alert.alert("Select rating", "Please choose at least 1 star.");
        return;
      }

      setSubmitting(true);

      const url = `${config.BASE_URL}/donations/${donationId}/rate`;

      const res = await axios.post(url, {
        donor_id: donorId,
        rating: rating,
        comment: null, // إذا بدك تعليق لاحقاً بنضيفه
      });

      if (res?.data?.ok) {
        setSubmitted(true);
        Alert.alert("Thank you!", "Your rating has been submitted.");
        // رجّعيه بعد شوي (اختياري)
        setTimeout(() => navigation.goBack(), 600);
      } else {
        Alert.alert("Error", res?.data?.message || "Failed to submit rating.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Server error while submitting rating.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo Top */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Thank You for Giving!</Text>
        <Text style={styles.subtitle}>Your feedback helps us grow</Text>

        {/* Stars */}
        <View style={styles.starContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRating(star)}
              activeOpacity={0.7}
              disabled={submitted}
            >
              <Ionicons
                name={rating >= star ? "star" : "star-outline"}
                size={45}
                color={rating >= star ? "#D4AF37" : "#A27571"}
                style={styles.starIcon}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic Message */}
        <Animated.View
          style={[
            styles.messageBox,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.feedbackText}>{getFeedbackMessage()}</Text>
        </Animated.View>

        {/* Submit */}
        {rating > 0 && (
          <TouchableOpacity
            style={[styles.submitBtn, submitted && styles.btnDone]}
            onPress={submitRating}
            disabled={submitted || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {submitted ? "Thank You!" : "Submit Rating"}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Small hint */}
        <Text style={styles.hint}>
          You can rate only after the donation is delivered.
        </Text>
      </View>

      {/* Footer Logo */}
      <View style={styles.footer}>
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
  container: { flex: 1, backgroundColor: "#EBE1D7" },

  header: { alignItems: "center", marginTop: 20 },
  logo: { width: 150, height: 150 },

  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 30,
    justifyContent: "center",
    marginTop: -50,
  },

  title: {
    fontFamily: "Times New Roman",
    fontSize: 28,
    color: "#54403cff",
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Times New Roman",
    fontSize: 18,
    color: "#8b6f69",
    marginTop: 10,
    marginBottom: 30,
    textAlign: "center",
  },

  starContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 26,
  },
  starIcon: {
    marginHorizontal: 5,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },

  messageBox: {
    minHeight: 86,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackText: {
    fontFamily: "Times New Roman",
    fontSize: 16,
    color: "#54403cff",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },

  submitBtn: {
    marginTop: 34,
    backgroundColor: "#A27571",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 4,
  },
  btnDone: { backgroundColor: "#7B5C58", opacity: 0.9 },

  submitText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Times New Roman",
  },

  hint: {
    marginTop: 18,
    fontFamily: "Times New Roman",
    fontSize: 13,
    color: "#8b6f69",
    opacity: 0.9,
    textAlign: "center",
  },

  footer: { alignItems: "center", marginBottom: 20 },
  footerLogo: { width: 60, height: 60, opacity: 0.8 },
});
