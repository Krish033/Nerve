import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Resets the password using the OOB code from the reset email
 */
export default async function resetPassword(code: string, newPass: string): Promise<void> {
  return await confirmPasswordReset(auth, code, newPass);
}


