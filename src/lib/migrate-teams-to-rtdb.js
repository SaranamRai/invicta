// Copy existing Firestore teams into Firebase Realtime Database.

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

const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

async function migrateTeamsToRealtimeDatabase() {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase, ref, set } = await import("firebase/database");
  const { collection, getDocs, getFirestore } = await import("firebase/firestore");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const rtdb = getDatabase(app);

  console.log("Reading Firestore teams...");
  const teamsSnapshot = await getDocs(collection(db, "teams"));

  if (teamsSnapshot.empty) {
    console.log("No Firestore teams found.");
    return;
  }

  let copied = 0;
  let skipped = 0;

  for (const teamDoc of teamsSnapshot.docs) {
    const team = teamDoc.data();
    const phone = normalizePhone(team.phone || team.contactNumber);

    if (phone.length !== 10) {
      skipped += 1;
      console.warn(`SKIP ${teamDoc.id}: phone/contactNumber is not exactly 10 digits.`);
      continue;
    }

    const realtimeTeam = {
      ...team,
      id: teamDoc.id,
      phone,
      contactNumber: phone,
      source: team.source || "firestore-migration"
    };

    await set(ref(rtdb, `teams/${teamDoc.id}`), realtimeTeam);
    copied += 1;
    console.log(`COPIED ${teamDoc.id}: ${realtimeTeam.name || realtimeTeam.department || "Unnamed team"}`);
  }

  console.log(`Done. Copied ${copied} team(s), skipped ${skipped} team(s).`);
}

migrateTeamsToRealtimeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error.message || error);
    process.exit(1);
  });
