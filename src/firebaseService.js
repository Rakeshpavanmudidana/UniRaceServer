import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "unirace-9c79c.firebaseapp.com",
  databaseURL: "https://unirace-9c79c-default-rtdb.firebaseio.com",
  projectId: "unirace-9c79c",
  storageBucket: "unirace-9c79c.firebasestorage.app",
  messagingSenderId: "396590569940",
  appId: "1:396590569940:web:651076e392456115b49e41",
  measurementId: "G-XLQBT8CCBM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref };
