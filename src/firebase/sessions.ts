import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { handleFirestoreError, OperationType } from "./error";

export interface SavedAnalysisSession {
  sessionId: string;
  userId: string;
  title: string;
  datasetName: string;
  totalRecords: number;
  numClusters: number;
  numAnomalies: number;
  anomalyPercentage: number;
  eps: number;
  minSamples: number;
  metric: string;
  selectedFeatures: string[];
  createdAt: string;
}

export async function saveUserSession(session: SavedAnalysisSession): Promise<void> {
  const path = `users/${session.userId}/sessions/${session.sessionId}`;
  try {
    await setDoc(doc(db, "users", session.userId, "sessions", session.sessionId), session);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserSessions(userId: string): Promise<SavedAnalysisSession[]> {
  const path = `users/${userId}/sessions`;
  try {
    const q = query(collection(db, "users", userId, "sessions"));
    const snapshot = await getDocs(q);
    const sessions: SavedAnalysisSession[] = [];
    snapshot.forEach((d) => {
      sessions.push(d.data() as SavedAnalysisSession);
    });
    // Sort client-side by createdAt descending
    sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sessions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteUserSession(userId: string, sessionId: string): Promise<void> {
  const path = `users/${userId}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "sessions", sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Analyst",
        photoURL: user.photoURL || "",
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
