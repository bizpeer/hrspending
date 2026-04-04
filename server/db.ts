import { adminDb } from './firebaseAdmin';

/**
 * Google Cloud Firestore 데이터베이스 초기화
 * Firestore는 NoSQL로 테이블 생성이 필요 없으나, 초기 관리를 위한 설정을 수행합니다.
 */
export const initDB = async () => {
  try {
    // 초기 관리자(bizpeer) 문서가 존재하는지 확인하고 필요 시 생성
    const adminRef = adminDb.collection('users').doc('bizpeer');
    const docSnap = await adminRef.get();
    
    if (!docSnap.exists) {
      await adminRef.set({
        employee_id: 'bizpeer',
        name: '최고 관리자',
        department: '관리본부',
        position: '대표이사',
        role: 'DIRECTOR',
        annual_leave_total: 15,
        annual_leave_used: 0,
        createdAt: new Date().toISOString()
      });
      console.log('Firebase Firestore: Initial admin (bizpeer) document seeded.');
    } else {
      console.log('Firebase Firestore: Database connected and ready.');
    }
  } catch (error) {
    console.error('Firebase Firestore Initialization Error:', error);
    // 에러 발생 시 (인증 오류 등) 에러를 로깅하고 사용자에게 키 파일 확인 권고
    console.warn('Please ensure that the "serviceAccount.json" is placed in the server directory or GOOGLE_APPLICATION_CREDENTIALS env is set.');
  }
};

// 기존 PostgreSQL pool 대신 Firestore adminDb 인스턴스를 직접 사용하도록 내보냅니다.
export const db = adminDb;
