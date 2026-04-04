import { adminDb, adminAuth } from './firebaseAdmin';

/**
 * Google Cloud Firestore 및 Auth 초기화
 * 초기 관리자(bizpeer) 정보를 생성합니다.
 */
export const initDB = async () => {
  const adminEmail = 'bizpeer@internal.com';
  const adminPassword = '1234';
  const adminUid = 'bizpeer';

  try {
    // 1. Firebase Auth 유저 확인 및 생성
    try {
      await adminAuth.getUserByEmail(adminEmail);
      console.log('Firebase Auth: admin user already exists.');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        await adminAuth.createUser({
          uid: adminUid,
          email: adminEmail,
          password: adminPassword,
          displayName: '최고 관리자',
        });
        console.log('Firebase Auth: admin user (bizpeer) created.');
      } else {
        throw error;
      }
    }

    // 2. Firestore 문서 확인 및 생성
    const adminRef = adminDb.collection('users').doc(adminUid);
    const docSnap = await adminRef.get();
    
    if (!docSnap.exists) {
      await adminRef.set({
        uid: adminUid,
        employee_id: 'bizpeer',
        email: adminEmail,
        name: '최고 관리자',
        department: '관리본부',
        position: '대표이사',
        role: 'DIRECTOR',
        annual_leave_total: 15,
        annual_leave_used: 0,
        createdAt: new Date().toISOString()
      });
      console.log('Firebase Firestore: admin document seeded.');
    }
  } catch (error) {
    console.error('Migration Seeding Error:', error);
  }
};

// 기존 PostgreSQL pool 대신 Firestore adminDb 인스턴스를 직접 사용하도록 내보냅니다.
export const db = adminDb;
