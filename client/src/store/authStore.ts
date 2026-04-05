import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type Role = 'ADMIN' | 'SUB_ADMIN' | 'EMPLOYEE';

export interface TeamHistory {
  teamId: string;
  teamName: string;
  joinedAt: string;
  leftAt: string;
}

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: Role;
  teamId?: string;
  teamHistory?: TeamHistory[];
  joinDate?: string; // 입사일 (YYYY-MM-DD)
  annualLeaveTotal?: number; // 총 발생 연차
  usedLeave?: number; // 사용한 연차
  mustChangePassword?: boolean; // 최초 로그인 시 비밀번호 변경 여부
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isLoginModalOpen: boolean;
  initAuth: () => (() => void);
  setUserData: (userData: UserData | null) => void;
  setLoginModalOpen: (isOpen: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  loading: true,
  isLoginModalOpen: false,
  setUserData: (userData) => set({ userData }),
  setLoginModalOpen: (isOpen) => set({ isLoginModalOpen: isOpen }),
  logout: async () => {
    try {
      await auth.signOut();
      set({ user: null, userData: null });
    } catch (error) {
      console.error("Logout failed", error);
    }
  },
  initAuth: () => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("[Auth] State Change:", user ? `Logged in (${user.email})` : "Logged out");
      
      if (user) {
        const isMaster = user.email?.toLowerCase().trim() === 'bizpeer@internal.com';
        set({ user, loading: true });
        try {
          const profileDoc = await getDoc(doc(db, 'UserProfile', user.uid));
          let currentData: UserData | null = profileDoc.exists() ? (profileDoc.data() as UserData) : null;

          // 만약 쓰기 권한 에러 등으로 본인 UID 문서가 안 만들어졌다면 임시 문서(temp)를 찾아서 매핑합니다 (우회)
          if (!currentData && user.email) {
            console.log("UID document not found. Searching by email for temporary profile...");
            const q = query(collection(db, 'UserProfile'), where('email', '==', user.email), limit(1));
            const fallbackSnap = await getDocs(q);
            if (!fallbackSnap.empty) {
              currentData = fallbackSnap.docs[0].data() as UserData;
              currentData.uid = user.uid; // 내부적으로 UID만 덮어씌워 정상 로그인 처리
            }
          }
          
          // [마스터 권한 강제 보장] 데이터가 없거나 역할이 ADMIN이 아니면 강제로 수정
          if (isMaster) {
            if (!currentData || currentData.role !== 'ADMIN') {
              currentData = {
                uid: user.uid,
                email: user.email || 'bizpeer@internal.com',
                name: currentData?.name || '최고 관리자',
                role: 'ADMIN',
                teamHistory: currentData?.teamHistory || [],
                teamId: currentData?.teamId || ''
              };
              await setDoc(doc(db, 'UserProfile', user.uid), currentData);
              console.log("[Auth] Master profile FORCED/RECOVERED to ADMIN.");
            }
          }
          
          set({ userData: currentData, loading: false });
          console.log("[Auth] Final UserData:", currentData);
        } catch (error) {
          console.error("[Auth] Error fetching doc:", error);
          set({ userData: null, loading: false });
        }
      } else {
        set({ user: null, userData: null, loading: false });
      }
    });

    return unsubscribeAuth;
  }
}));
