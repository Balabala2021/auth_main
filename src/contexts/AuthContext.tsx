
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db, getToken, messaging } from '@/lib/firebase';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';

export interface AppUser extends User {
  role?: string | null;
}

interface AuthContextType {
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

    const  login = async (email: string, password: string) => {
    // 🔐 Step 1: Sign in user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔔 Step 2: Try to get FCM token (best-effort). Do NOT fail login if blocked/denied.
    try {
      const fcmToken = await getToken(messaging, {
        vapidKey: "BJR3c-k3SRZ5VgjY2XguP9c9u_EtqR5gZ1I0AfnUGnhgEPGYyepRzucYb2w6248d9rBdsIoyLLERAvkPk2SGsVM",
      });
      if (fcmToken) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docRef = doc(db, "users", querySnapshot.docs[0].id);
            await updateDoc(docRef, {
              fcmToken,
            });
            console.log("✅ FCM token updated by email.");
          } else {
            console.warn("⚠️ No user found with that email.");
          }
      } else {
        console.info("FCM token unavailable (possibly blocked); continuing without push notifications.");
      }
    } catch (err) {
      console.warn("Skipping FCM token registration due to error:", err);
    }
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        (async () => {
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const querySnapshot = await getDocs(q);
            let role = null;
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              role = userData.role || null;
            }
            setCurrentUser({ ...user, role });
          } catch (e) {
            setCurrentUser({ ...user, role: null });
          }
          setLoading(false);
        })();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
