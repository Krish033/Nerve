import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Sends a password reset email via Firebase
 */
export default async function sendResetEmail(email: string): Promise<void> {
  return await sendPasswordResetEmail(auth, email);
}


