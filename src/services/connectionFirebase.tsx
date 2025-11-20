// services/connectionFirebase.tsx
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDogZFYiafDGay3Bvd1EzXFVdBQVZ4LyTk",

  authDomain: "sneaker-store-app-60c23.firebaseapp.com",

  projectId: "sneaker-store-app-60c23",

  storageBucket: "sneaker-store-app-60c23.firebasestorage.app",

  messagingSenderId: "759471234154",

  appId: "1:759471234154:web:8763d1e7ad96c7575f3e13"

};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;

