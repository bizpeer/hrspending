import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  loading: true,
  isLoginModalOpen: false,
  setUserData: (userData) => set({ userData }),
  setLoginModalOpen: (isOpen) => set({ isLoginModalOpen: isOpen }),
  initAuth: () => {
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        set({ user, loading: true });
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            set({ userData: userDoc.data() as UserData, loading: false });
          } else {
            // 유저 문서가 Firestore에 없으면 알 수 없는 상태
            set({ userData: null, loading: false });
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
