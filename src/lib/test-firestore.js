// src/lib/test-firestore.js

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

async function testWrite() {
  console.log("Loading Firebase SDKs from local node_modules...");
  const { initializeApp } = await import("firebase/app");
  const { getFirestore, doc, setDoc } = await import("firebase/firestore");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Starting Firestore write test...");
  
  // Set up a promise timeout of 8 seconds
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Firestore write timed out after 8 seconds")), 8000)
  );

  const writeOperation = setDoc(doc(db, "matches", "test_match_id"), {
    message: "Hello from local workspace test script!",
    timestamp: Date.now()
  });

  try {
    await Promise.race([writeOperation, timeout]);
    console.log("SUCCESS: Document written successfully to Firestore!");
  } catch (error) {
    console.error("FAILURE:", error.message || error);
  }
  process.exit(0);
}

testWrite().catch(err => {
  console.error("CRITICAL ERROR:", err);
  process.exit(1);
});
