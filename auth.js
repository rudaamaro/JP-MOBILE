import { auth } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

export function onAuthState(cb){
  return onAuthStateChanged(auth, cb);
}

export function signIn(email, pass){
  return signInWithEmailAndPassword(auth, email, pass);
}

export function signUp(email, pass){
  return createUserWithEmailAndPassword(auth, email, pass);
}

export function resetPassword(email){
  return sendPasswordResetEmail(auth, email);
}

export function signOutUser(){
  return signOut(auth);
}
