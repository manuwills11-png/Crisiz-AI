import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCgtpySAjqP68Uq1YYwTKoraUYNIrbAwQ4",
  authDomain: "userwebsite-109b8.firebaseapp.com",
 // databaseURL: "https://userwebsite-109b8-default-rtdb.firebaseio.com",
  projectId: "userwebsite-109b8",
  storageBucket: "userwebsite-109b8.firebasestorage.app",
  messagingSenderId: "805230657741",
  appId: "1:805230657741:web:b464ac819fb366743d6984"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);