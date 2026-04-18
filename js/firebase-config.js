import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDc7qTTa_GWwIAawYLMtvH3pPB17lRaWTA",
  authDomain: "dailiriz.firebaseapp.com",
  projectId: "dailiriz",
  storageBucket: "dailiriz.firebasestorage.app",
  messagingSenderId: "730164165940",
  appId: "1:730164165940:web:59235cf72fc6f5173ef961"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const formatDateID = (date) => {
  if (!date) return 'Baru saja';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
