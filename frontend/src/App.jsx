import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Destinations from "./pages/Destinations";
import DestinationDetail from "./pages/DestinationDetail";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import BookPackage from "./pages/BookPackage";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import TripPlan from "./pages/TripPlan";
import Budget from "./pages/Budget";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:slug" element={<DestinationDetail />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route
  path="/budget"
  element={<ProtectedRoute roles={["TRAVELER"]}><Budget /></ProtectedRoute>}
/>
          
          <Route
  path="/dashboard"
  element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
/>
<Route
  path="/book/package/:id"
  element={<ProtectedRoute roles={["TRAVELER"]}><BookPackage /></ProtectedRoute>}
/>
<Route path="/plan" element={<PlanTrip />} />
<Route
  path="/plans/:id"
  element={<ProtectedRoute roles={["TRAVELER"]}><TripPlan /></ProtectedRoute>}
/>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}