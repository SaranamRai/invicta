import { db, storage } from "../firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  addDoc,
  getDocs,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MatchData, ActivityLog } from "../types";

export const updateMatchStatus = async (matchId: string, status: MatchData['status']) => {
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, { 
    status,
    lastUpdated: Date.now() 
  });
};

export const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number) => {
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, { 
    scoreA, 
    scoreB,
    lastUpdated: Date.now() 
  });
};

export const updateMatchDetails = async (matchId: string, details: Partial<MatchData>) => {
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, {
    ...details,
    lastUpdated: Date.now()
  });
};

export const logActivity = async (matchId: string, action: string, volunteerEmail: string) => {
  await addDoc(collection(db, "activityLogs"), {
    matchId,
    action,
    timestamp: Date.now(),
    volunteerEmail
  });
};

export const uploadMatchImage = async (file: File, matchId: string): Promise<string> => {
  const storageRef = ref(storage, `matches/${matchId}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  
  await updateMatchDetails(matchId, { imageUrl: url });
  return url;
};

export const getAllMatches = async (): Promise<MatchData[]> => {
  const snapshot = await getDocs(collection(db, "matches"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchData));
};

export const getMatchById = async (matchId: string): Promise<MatchData | null> => {
  const snapshot = await getDoc(doc(db, "matches", matchId));
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as MatchData;
  }
  return null;
};

export const createLiveFeedPost = async (
  matchId: string, 
  matchTitle: string, 
  content: string, 
  volunteerEmail: string, 
  imageUrl?: string
) => {
  await addDoc(collection(db, "liveFeeds"), {
    matchId,
    matchTitle,
    content,
    imageUrl: imageUrl || null,
    timestamp: Date.now(),
    volunteerEmail
  });
};

export const uploadFeedImage = async (file: File): Promise<string> => {
  const storageRef = ref(storage, `liveFeeds/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
};
