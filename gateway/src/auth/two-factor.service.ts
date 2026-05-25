import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  /**
   * Generates a new TOTP secret for a user.
   */
  generateSecret(email: string) {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Nerve Platform',
      label: email,
      secret,
    });
    
    return {
      secret,
      otpauthUrl,
    };
  }

  /**
   * Generates a QR code data URL from an otpauth URL.
   */
  async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl);
  }

  /**
   * Verifies a TOTP token against a secret.
   */
  async verifyToken(token: string, secret: string): Promise<boolean> {
    const result = await verify({
      token,
      secret,
      epochTolerance: 30, // Allow 1 step (30s) of drift
    });
    return result.valid;
  }
}
