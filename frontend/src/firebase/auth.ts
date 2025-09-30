import { auth } from "./firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential
} from "firebase/auth"

// Email + password login
export const doSignInWithEmailAndPassword = (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password)
}

// Create account
export const doCreateUserWithEmailAndPassword = (
  email: string,
  password: string
): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password)
}

// Google sign in
export const doSignInWithGoogle = (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}
