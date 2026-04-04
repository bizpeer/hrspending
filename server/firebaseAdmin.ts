import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// 서비스 계정 키 파일 경로 (상대 경로 또는 환경 변수)
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccount.json');

try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // 서비스 계정 키가 없는 경우에도 서버가 죽지 않게 처리 (환경 변수 또는 파일 확인 유도)
  console.warn('Proceeding without Firebase Admin authentication. Please check your serviceAccount.json file.');
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
