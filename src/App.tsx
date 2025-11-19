
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";
import { HotelListing } from "@/components/HotelListing";
import { Navigation } from "@/components/Navigation";
import { useEffect } from "react";
import {  onMessage } from "firebase/messaging";
import { messaging } from "./lib/firebase";
import { getToken, deleteToken } from "firebase/messaging";
import AdminLogin from "./pages/Login";
import AdminDashboard from "./pages/Dashboard";
import AdminHotels from "./pages/Hotels";
import AdminRooms from "./pages/Rooms";
import AdminSites from "./pages/Sites";
import Staff from "./pages/Staff";
import AdminBookings from "./pages/Bookings";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

function AppContent() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // Hook to handle navigation
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
  onMessage(messaging, (payload) => {
    // Skip notifications for admin routes
    if (location.pathname.startsWith("/admin")) {
      return;
    }

    if (payload.data) {
      const { title, body, redirect_route } = payload.data;
      const redirectRoute = redirect_route || "/";

      // Browser notification
      if (Notification.permission === "granted") {
        const notification = new Notification(title, {
          body,
          icon: "/logo.png",
          data: { redirect_route: redirectRoute }
        });
        notification.onclick = () => {
          navigate(redirectRoute);
          window.focus();
          notification.close();
        };
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            const notification = new Notification(title, {
              body,
              icon: "/logo.png",
              data: { redirect_route: redirectRoute }
            });
            notification.onclick = () => {
              navigate(redirectRoute);
              window.focus();
              notification.close();
            };
          }
        });
      }

      // Toast notification
      const toastId = toast(
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p>{body}</p>
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                navigate(redirectRoute);
              }}
              className="px-3 py-1 bg-brand text-white rounded hover:bg-brand-dark"
            >
              Open
            </button>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Ignore
            </button>
          </div>
        </div>,
        { duration: 10000, position: "top-right" }
      );
    }
  });
}, [navigate]);


  useEffect(() => {
    navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
        });
 
  }, []);

  if (!currentUser) {
    return isAdminRoute? <AdminLogin/> : <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hotels" element={<HotelListing />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/hotel" element={<AdminHotels />} />
          <Route path="/admin/rooms" element={<AdminRooms />} />
          <Route path="/admin/sites" element={<AdminSites />} />
          <Route path="/admin/user" element={<Staff />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
        </Route>
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);



export default App;
