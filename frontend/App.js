import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './pages/Login';
import SelectUserType from './components/UserType';
import RegisterForDonor from './pages/RegisterForDonor';
import RegisterForAssociation from './pages/RegisterForAssociation';
import ForgotPassword from './pages/ForgotPassword';
import ChooseDonationType from './pages/ChooseDonationType';




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
        </Stack.Navigator>
      </NavigationContainer>
  );
}
