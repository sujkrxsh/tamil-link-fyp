// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1HOkaD9dx-AOYaVXJJ2SQKYgsZl0eUgU",
  authDomain: "tamillink-cd32d.firebaseapp.com",
  projectId: "tamillink-cd32d",
  storageBucket: "tamillink-cd32d.firebasestorage.app",
  messagingSenderId: "476583266782",
  appId: "1:476583266782:web:281602e316c37e876ab54f",
  measurementId: "G-WP7QZ6G0N8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);