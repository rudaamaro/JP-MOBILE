export const firebaseConfig = {
  apiKey: "___API_KEY___",
  authDomain: "___AUTH_DOMAIN___",
  projectId: "___PROJECT_ID___",
  storageBucket: "___STORAGE_BUCKET___",
  messagingSenderId: "___SENDER_ID___",
  appId: "___APP_ID___"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
