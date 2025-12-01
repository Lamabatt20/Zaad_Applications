import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './pages/Login';
import SelectUserType from './components/UserType';
import RegisterForDonor from './pages/RegisterForDonor';
import RegisterForAssociation from './pages/RegisterForAssociation';
import ForgotPassword from './pages/ForgotPassword';
import ClothesAssociationsScreen from './pages/ClothesAssociationsScreen';
import FoodAssociationsScreen from './pages/FoodAssociationsScreen';
import AssociationInfo from "./pages/AssociationInfo";
import DonateClothesScreen from "./pages/DonateClothesScreen";
import ChooseDonationType from './pages/ChooseDonationType';
import ChatBotScreen from "./pages/Chatbot";
import ProfileScreen from "./pages/Profile";
import EditProfileScreen from "./pages/EditProfile";
import ChangePassword from './pages/ChangePassword';
import SearchAssociation from './pages/SearchAssociation';




const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="UserType" component={SelectUserType} />
          <Stack.Screen name="RegisterForDonor" component={RegisterForDonor} />
          <Stack.Screen name="RegisterForAssociation" component={RegisterForAssociation} />
          <Stack.Screen
            name="ChooseDonationType"
            component={ChooseDonationType}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="ClothesAssociationsScreen" component={ClothesAssociationsScreen} />
          <Stack.Screen name="FoodAssociationsScreen" component={FoodAssociationsScreen} />
          <Stack.Screen name="SearchAssociation" component={SearchAssociation} />
          <Stack.Screen name="AssociationInfo" component={AssociationInfo} />
          <Stack.Screen name="DonateClothesScreen" component={DonateClothesScreen} />
          <Stack.Screen name="ChatBotScreen" component={ChatBotScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePassword} />

          </Stack.Navigator>
      </NavigationContainer>
  );
}
