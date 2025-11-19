import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface AppUser {
  uid: string;
  email: string | null;
  role?: string;
  [key: string]: any;
}

export function useCurrentUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserByEmail = async (email: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    return null;
  };

  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser && firebaseUser.email) {
      try {
        const userData = await fetchUserByEmail(firebaseUser.email);
        setUser(
          userData
            ? { uid: firebaseUser.uid, email: firebaseUser.email, ...userData }
            : null
        );
      } catch (error) {
        setUser(null);
        console.error("Error refreshing user doc:", error);
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const userData = await fetchUserByEmail(firebaseUser.email);
          if (isMounted) {
            setUser(
              userData
                ? { uid: firebaseUser.uid, email: firebaseUser.email, ...userData }
                : null
            );
          }
        } catch (error) {
          if (isMounted) setUser(null);
          console.error("Error fetching user doc:", error);
        }
      } else {
        if (isMounted) setUser(null);
      }
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { user, loading, refreshUser };
}