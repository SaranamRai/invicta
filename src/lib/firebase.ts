import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHRj-HSVldwEWhRWNRkg5xHKgp1uCdms8",
  authDomain: "invictia-41863.firebaseapp.com",
  databaseURL: "https://invictia-41863-default-rtdb.firebaseio.com",
  projectId: "invictia-41863",
  storageBucket: "invictia-41863.firebasestorage.app",
  messagingSenderId: "418389563989",
  appId: "1:418389563989:web:a4b47fcb9167819fd192dc",
  measurementId: "G-H0YXN9YP9L"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, rtdb, googleProvider };
