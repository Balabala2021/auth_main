
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";


const firebaseConfig = {
  apiKey: "AIzaSyBhokyGoDk5fMymMinKWHDPrKxAZMdsqx8",
  authDomain: "motel-app-4e3c7.firebaseapp.com",
  projectId: "motel-app-4e3c7",
  storageBucket: "motel-app-4e3c7.firebasestorage.app",
  messagingSenderId: "402837874017",
  appId: "1:402837874017:web:c10ea66ca9ec26c21b9120",
  measurementId: "G-83GJBCRMK0"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const messaging = getMessaging(app);
const db = getFirestore(app);


export { app,auth,db, messaging, getToken, onMessage };
