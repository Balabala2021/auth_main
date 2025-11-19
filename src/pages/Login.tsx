import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, getToken, messaging } from "@/lib/firebase";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // First authenticate the user
      await signInWithEmailAndPassword(auth, email, password);

      // Then check their role in Firestore

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Clear any existing session
        await signOut(auth);
        // Clear any stored tokens or session data
        localStorage.clear();
        sessionStorage.clear();
        setError("User not found in the system.");
        return;
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.role !== "admin") {
        // Clear any existing session
        await signOut(auth);
        // Clear any stored tokens or session data
        localStorage.clear();
        sessionStorage.clear();
        setError("Access denied. Admin privileges required.");
        return;
      }

      // Try to get FCM token (non-blocking). Navigate regardless of outcome.
      try {
        const fcmToken = await getToken(messaging, {
          vapidKey:
            "BJR3c-k3SRZ5VgjY2XguP9c9u_EtqR5gZ1I0AfnUGnhgEPGYyepRzucYb2w6248d9rBdsIoyLLERAvkPk2SGsVM",
        });
        if (fcmToken) {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", userData.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docRef = doc(db, "users", querySnapshot.docs[0].id);
            await updateDoc(docRef, {
              fcmToken,
            });
            console.log("FCM token updated by email.");
          } else {
            console.warn("No user found with that email.");
          }
        } else {
          console.info("FCM token unavailable (possibly blocked); continuing to dashboard.");
        }
      } catch (tokenErr) {
        console.warn("Skipping FCM token registration due to error:", tokenErr);
        // Intentionally continue to navigate
      }

      // Navigate to admin dashboard regardless of token result
      navigate("/admin/dashboard");

      // Only store session for admin users
     
    } catch (error: any) {
      // Clear any existing session on error
      await signOut(auth);
      // Clear any stored tokens or session data
      localStorage.clear();
      sessionStorage.clear();
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <img
            src="/logo.png" // Place your logo image as 'logo.png' in the public folder
            alt="Hotel Logo"
            className="object-contain "
          />

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, background: "#758533" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminLogin;
