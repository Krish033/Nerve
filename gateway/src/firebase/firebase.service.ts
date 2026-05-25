import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {}

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.firebaseApp.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Firebase verifyIdToken error:', error);
      throw error;
    }
  }

  getAuth() {
    return this.firebaseApp.auth();
  }

  async sendPushNotification(token: string, title: string, body: string, data?: any) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: token,
      };

      const response = await this.firebaseApp.messaging().send(message);
      return response;
    } catch (error) {
      console.error('Firebase sendPushNotification error:', error);
      throw error;
    }
  }
}
