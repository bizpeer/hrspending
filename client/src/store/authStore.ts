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
      console.log("[Auth] State Change:", user ? `Logged in (${user.email})` : "Logged out");
      
      if (user) {
        const isMaster = user.email?.toLowerCase().trim() === 'bizpeer@internal.com';
        set({ user, loading: true });
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let currentData: UserData | null = userDoc.exists() ? (userDoc.data() as UserData) : null;
          
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
              await setDoc(doc(db, 'users', user.uid), currentData);
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
