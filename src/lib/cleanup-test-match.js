// src/lib/cleanup-test-match.js

const firebaseConfig = {
  apiKey: "AIzaSyAHRj-HSVldwEWhRWNRkg5xHKgp1uCdms8",
  authDomain: "invictia-41863.firebaseapp.com",
  databaseURL: "https://invictia-41863-default-rtdb.firebaseio.com",
  projectId: "invictia-41863",
  storageBucket: "invictia-41863.firebasestorage.app",
  messagingSenderId: "418389563989",
  appId: "1:418389563989:web:a4b47fcb9167819fd192dc",
  measurementId: "G-H0YXN9YP9L"
};

async function cleanup() {
  const { initializeApp } = await import("firebase/app");
  const { getFirestore, doc, deleteDoc } = await import("firebase/firestore");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Locating corrupted test_match_id document in matches...");
  const matchRef = doc(db, "matches", "test_match_id");

  try {
    await deleteDoc(matchRef);
    console.log("SUCCESS: Corrupted test_match_id document successfully deleted from Firestore!");
  } catch (error) {
    console.error("FAILURE: Could not delete test_match_id:", error.message || error);
  }
  process.exit(0);
}

cleanup();
