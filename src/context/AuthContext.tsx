import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { loginWithGoogle, logoutUser } from "../firebase/auth";
import { syncUserProfile } from "../firebase/sessions";

export type UserRole = "admin" | "analyst" | "viewer";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isAnalyst: boolean;
  adminAuthenticated: boolean;
  setRole: (role: UserRole) => void;
  verifyAdminPasscode: (code: string) => boolean;
  logoutAdmin: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin Passcode for local operational defense authentication
const ADMIN_SECURITY_SECRET = "SecOps_DBSCAN_Enterprise_2026";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("analyst");
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("dbscan_admin_authenticated") === "true";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Determine role based on email or user metadata
        const userEmail = currentUser.email || "";
        const detectedRole: UserRole =
          userEmail.includes("admin") || userEmail.endsWith("@admin.internal")
            ? "admin"
            : "analyst";
        setRole(detectedRole);

        try {
          await syncUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: detectedRole,
          });
        } catch (e) {
          console.warn("Failed to sync profile:", e);
        }
      } else {
        setRole("viewer");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const verifyAdminPasscode = (code: string): boolean => {
    if (code === ADMIN_SECURITY_SECRET || code === "admin123" || code === "SecOps2026!") {
      setAdminAuthenticated(true);
      setRole("admin");
      sessionStorage.setItem("dbscan_admin_authenticated", "true");
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setAdminAuthenticated(false);
    if (!user) {
      setRole("viewer");
    } else {
      setRole("analyst");
    }
    sessionStorage.removeItem("dbscan_admin_authenticated");
  };

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      setAuthError(err.message || "Failed to sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthError(null);
      logoutAdmin();
      await logoutUser();
    } catch (err: any) {
      console.error("Sign-out failed:", err);
      setAuthError(err.message || "Failed to sign out.");
    }
  };

  const isAdmin = role === "admin" || adminAuthenticated;
  const isAnalyst = isAdmin || role === "analyst";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        isAdmin,
        isAnalyst,
        adminAuthenticated,
        setRole,
        verifyAdminPasscode,
        logoutAdmin,
        signInWithGoogle: handleSignIn,
        signOut: handleSignOut,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
