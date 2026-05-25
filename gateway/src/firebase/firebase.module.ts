import { Module, Global, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { FirebaseService } from './firebase.service';

const FirebaseAdminProvider: Provider = {
  provide: 'FIREBASE_ADMIN',
  useFactory: (configService: ConfigService) => {
    // Try multiple possible locations for the service account file
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'firebase', 'local-51c92-firebase-adminsdk-fbsvc-8dc5d1d575.json'),
      path.join(process.cwd(), 'dist', 'firebase', 'local-51c92-firebase-adminsdk-fbsvc-8dc5d1d575.json'),
      path.join(__dirname, '..', 'firebase', 'local-51c92-firebase-adminsdk-fbsvc-8dc5d1d575.json'),
      path.join(__dirname, 'local-51c92-firebase-adminsdk-fbsvc-8dc5d1d575.json'),
    ];

    let serviceAccountPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        serviceAccountPath = p;
        break;
      }
    }

    if (serviceAccountPath) {
      console.log(`Firebase Module: Initializing with service account file: ${serviceAccountPath}`);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
    }

    // Fallback to environment variables
    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail) {
      console.log('Firebase Module: Initializing with environment variables.');
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    }

    console.log('Firebase Module: Initializing with default credentials.');
    return admin.initializeApp();
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [FirebaseAdminProvider, FirebaseService],
  exports: [FirebaseAdminProvider, FirebaseService],
})
export class FirebaseModule {}
