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
import MultiDonateStep from './pages/MultiDonateStep';
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
import MultiDonateClothesStep from './pages/MultiDonateClothesStep';
import AssociationHomeClothe from './pages/AssociationHomeClothe';
import AssociationHomeFood from './pages/AssociationHomeFood';
import AssociationHomeAll from './pages/AssociationHomeAll';
import AdminDashboard from './pages/Admin Dashboard';
import PendingAssociations from './pages/PendingAssociations';
import WaitingApproval from './pages/WaitingForApprovalScreen';
import VerifyPhone from './pages/VerifyPhone';
import ScanScreen from './pages/ScanScreen';
import ThankYouSelfDeliveryScreen from './pages/ThankYouSelfDeliveryScreen';
import UnderReviewDeliveryScreen from './pages/UnderReviewDeliveryScreen';
import DeliveryMethodScreen from './pages/DeliveryMethodScreen';
import AddDeliveryPerson from './pages/AddDeliveryPersonScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import DeliveryOrdersScreen from './pages/DeliveryOrdersScreen';
import DeliveryTrackScreen from './pages/DeliveryTrackScreen';
import DonationHistoryScreen from './pages/DonationHistoryScreen';
import DonationTrackScreen from './pages/DonationTrackScreen';
import DonationDeliverScreen from './pages/DonationDeliverScreen';
import DonationRating from './pages/DonationRating';
import DonationsReport from './pages/DonationsReport';
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
          <Stack.Screen name="MultiDonateStep" component={MultiDonateStep} />
          <Stack.Screen name="MultiDonateClothesStep" component={MultiDonateClothesStep} />
          <Stack.Screen name="AssociationHomeClothe" component={AssociationHomeClothe} />
          <Stack.Screen name="AssociationHomeFood" component={AssociationHomeFood} />
          <Stack.Screen name="AssociationHomeAll" component={AssociationHomeAll} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="PendingAssociations" component={PendingAssociations} />
          <Stack.Screen name="WaitingApproval" component={WaitingApproval} />
          <Stack.Screen name="VerifyPhone" component={VerifyPhone} />
          <Stack.Screen name="AssignDeliveryPerson" component={AssignDeliveryPerson} />
          <Stack.Screen name="ScanScreen" component={ScanScreen} />
          <Stack.Screen name="ThankYouSelfDeliveryScreen" component={ThankYouSelfDeliveryScreen} />
          <Stack.Screen name="UnderReviewDeliveryScreen" component={UnderReviewDeliveryScreen} />
          <Stack.Screen name="DeliveryMethodScreen" component={DeliveryMethodScreen} />
          <Stack.Screen name="AddDeliveryPerson" component={AddDeliveryPerson} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="DeliveryOrdersScreen" component={DeliveryOrdersScreen} />
          <Stack.Screen name="DeliveryTrackScreen" component={DeliveryTrackScreen} />
          <Stack.Screen name="DonationHistoryScreen" component={DonationHistoryScreen} />
          <Stack.Screen name="DonationTrackScreen" component={DonationTrackScreen} />
          <Stack.Screen name="DonationDeliverScreen" component={DonationDeliverScreen} />
          <Stack.Screen name="DonationRating" component={DonationRating} />
          <Stack.Screen name="DonationsReport" component={DonationsReport} />
          </Stack.Navigator>
      </NavigationContainer>
  );
}
