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
import DonateFoodScreen from "./pages/DonateFoodScreen";
import EnterQuantityScreen from "./pages/EnterQuantityScreen";
import ChooseDonationType from './pages/ChooseDonationType';
import DashbordAssociationClothes from './pages/DashbordAssociationClothes';
import DashbordAssociationFoods from './pages/DashbordAssociationFoods';
import PendingClothesScreen from './pages/PendingClothesScreen';
import AcceptedClothesScreen from './pages/AcceptedClothesScreen';
import RejectedClothesScreen from './pages/RejectedClothesScreen';
import ChatBotScreen from "./pages/Chatbot";
import ProfileScreen from "./pages/Profile";
import EditProfileScreen from "./pages/EditProfile";
import ChangePassword from './pages/ChangePassword';
import SearchAssociation from './pages/SearchAssociation';
import ApprovedClothesScreen from './pages/ApprovedClothesScreen';
import AcceptedFoodsScreen from './pages/AcceptedFoodsScreen';
import ApprovedFoodsScreen from './pages/ApprovedFoodsScreen';  
import DashbordAssociationAll from './pages/DashbordAssociationAll';

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
            name="ChooseDonationType"component={ChooseDonationType} options={{headerShown: false, }}/>
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="ClothesAssociationsScreen" component={ClothesAssociationsScreen} />
          <Stack.Screen name="FoodAssociationsScreen" component={FoodAssociationsScreen} />
          <Stack.Screen name="SearchAssociation" component={SearchAssociation} />
          <Stack.Screen name="AssociationInfo" component={AssociationInfo} />
          <Stack.Screen name="EnterQuantityScreen" component={EnterQuantityScreen} />
          <Stack.Screen name="DonateClothesScreen" component={DonateClothesScreen} />
          <Stack.Screen name="DashboardAssociationClothes" component={DashbordAssociationClothes} />
          <Stack.Screen name="DashboardAssociationFood" component={DashbordAssociationFoods} />
          <Stack.Screen name="PendingClothesScreen" component={PendingClothesScreen} />
          <Stack.Screen name="AcceptedClothesScreen" component={AcceptedClothesScreen} />
          <Stack.Screen name="RejectedClothesScreen" component={RejectedClothesScreen} />
          <Stack.Screen name="DonateFoodScreen" component={DonateFoodScreen} />
          <Stack.Screen name="ChatBotScreen" component={ChatBotScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePassword} />
          <Stack.Screen name="ApprovedClothesScreen" component={ApprovedClothesScreen} /> 
          <Stack.Screen name="AcceptedFoodsScreen" component={AcceptedFoodsScreen} />
          <Stack.Screen name="ApprovedFoodsScreen" component={ApprovedFoodsScreen} />
          <Stack.Screen name="DashboardAssociationAll" component={DashbordAssociationAll} />

          </Stack.Navigator>
      </NavigationContainer>
  );
}
