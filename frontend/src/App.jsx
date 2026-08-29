import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Reviews from "./pages/Reviews";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Destinations from "./pages/Destinations";
import DestinationDetail from "./pages/DestinationDetail";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import BookPackage from "./pages/BookPackage";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import TripPlan from "./pages/TripPlan";
import Budget from "./pages/Budget";
import Messages from "./pages/Messages";
import GuideDashboard from "./pages/GuideDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Providers from "./pages/Providers";
import ProviderProfile from "./pages/ProviderProfile";
import BookProvider from "./pages/BookProvider";
import TripRequests from "./pages/TripRequests";
import BookingDetail from "./pages/BookingDetail";
import TripPlans from "./pages/TripPlans";
import ProviderSetup from "./pages/ProviderSetup";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:slug" element={<DestinationDetail />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/plan" element={<PlanTrip />} />
          <Route path="/guides" element={<Providers kind="guides" />} />
<Route path="/drivers" element={<Providers kind="drivers" />} />
<Route path="/providers/:userId" element={<ProviderProfile />} />

          {/* Any signed-in user */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/messages"
            element={<ProtectedRoute><Messages /></ProtectedRoute>}
          />
          <Route
            path="/messages/:bookingId"
            element={<ProtectedRoute><Messages /></ProtectedRoute>}
          />

          {/* Traveler only */}
          <Route
            path="/book/package/:id"
            element={<ProtectedRoute roles={["TRAVELER"]}><BookPackage /></ProtectedRoute>}
          />

          <Route
  path="/plans"
  element={<ProtectedRoute roles={["TRAVELER"]}><TripPlans /></ProtectedRoute>}
/>


          <Route
            path="/plans/:id"
            element={<ProtectedRoute roles={["TRAVELER"]}><TripPlan /></ProtectedRoute>}
          />
          <Route
            path="/budget"
            element={<ProtectedRoute roles={["TRAVELER"]}><Budget /></ProtectedRoute>}
          />

          {/* Guide only */}
          <Route
            path="/guide"
            element={<ProtectedRoute roles={["GUIDE"]}><GuideDashboard /></ProtectedRoute>}
          />

          {/* Driver Only */}
          <Route
            path="/driver"
            element={<ProtectedRoute roles={["DRIVER"]}><DriverDashboard /></ProtectedRoute>}
          />
          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>}
          />
          <Route
  path="/reviews"
  element={<ProtectedRoute roles={["TRAVELER"]}><Reviews /></ProtectedRoute>}
/>

<Route
  path="/book/provider/:userId"
  element={<ProtectedRoute roles={["TRAVELER"]}><BookProvider /></ProtectedRoute>}
/>

<Route
  path="/requests"
  element={<ProtectedRoute roles={["TRAVELER"]}><TripRequests /></ProtectedRoute>}
/>

<Route
  path="/bookings/:id"
  element={<ProtectedRoute><BookingDetail /></ProtectedRoute>}
/>
<Route
  path="/profile"
  element={<ProtectedRoute roles={["GUIDE", "DRIVER"]}><ProviderSetup /></ProtectedRoute>}
/>


        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}