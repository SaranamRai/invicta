// src/lib/check-user.js

const firebaseConfig = {
  apiKey: "AIzaSyAHRj-HSVldwEWhRWNRkg5xHKgp1uCdms8",
  authDomain: "invictia-41863.firebaseapp.com",
  projectId: "invictia-41863",
  messagingSenderId: "418389563989",
  appId: "1:418389563989:web:a4b47fcb9167819fd192dc",
  measurementId: "G-H0YXN9YP9L"
};

async function checkUser() {
  const { initializeApp } = await import("firebase/app");
  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const email = "volunteer@gmail.com";
  const password = "123456";

  console.log("Checking if user volunteer@gmail.com can sign in...");
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("SUCCESS: User already exists and signed in successfully!");
    console.log("UID:", cred.user.uid);
    process.exit(0);
  } catch (err) {
    console.log("Sign-in failed with error code:", err.code, "-", err.message);
    
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      console.log("Attempting to CREATE user volunteer@gmail.com with password 123456...");
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log("SUCCESS: Created volunteer@gmail.com successfully!");
        console.log("UID:", cred.user.uid);
        process.exit(0);
      } catch (createErr) {
        console.error("CRITICAL: Failed to create user:", createErr.code, "-", createErr.message);
      }
    }
  }
  process.exit(1);
}

checkUser();
