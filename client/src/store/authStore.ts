import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
      if (user) {
        set({ user, loading: true });
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            set({ userData: userDoc.data() as UserData, loading: false });
          } else {
            // [권한 복구 로직] bizpeer 계정인데 Firestore 문서가 없는 경우 자동 생성
            if (user.email === 'bizpeer@internal.com') {
              const newAdminData: UserData = {
                uid: user.uid,
                email: user.email,
                name: '최고 관리자 (복구됨)',
                role: 'ADMIN',
                teamHistory: []
              };
              await setDoc(doc(db, 'users', user.uid), newAdminData);
              set({ userData: newAdminData, loading: false });
              console.log("Master Admin profile recovered automatically.");
            } else {
              set({ userData: null, loading: false });
            }
          }
        } catch (error) {
          console.error("Failed to fetch user data", error);
          set({ userData: null, loading: false });
        }
      } else {
        set({ user: null, userData: null, loading: false });
      }
    });

    return unsubscribeAuth;
  }
}));
