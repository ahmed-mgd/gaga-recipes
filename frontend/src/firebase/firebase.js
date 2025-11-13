// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwcD7E5IRN28zdh7M5zQZndR8YEclIsOg",
  authDomain: "team-gaga-recipes.firebaseapp.com",
  projectId: "team-gaga-recipes",
  storageBucket: "team-gaga-recipes.firebasestorage.app",
  messagingSenderId: "515995378944",
  appId: "1:515995378944:web:215c3c0a627cd74b3fbfe5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };