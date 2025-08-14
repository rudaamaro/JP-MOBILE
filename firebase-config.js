// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyA89u1JP_rg6sWYWWobFB5Bg5JFaho1u7M",
  authDomain: "flashcards-jp-pt.firebaseapp.com",
  projectId: "flashcards-jp-pt",
  // O 'storageBucket' deve ser o NOME do bucket (.appspot.com), não o domínio .firebasestorage.app
  storageBucket: "flashcards-jp-pt.appspot.com",
  messagingSenderId: "163392706044",
  appId: "1:163392706044:web:1f6f0ed3a65b367c534e79"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
