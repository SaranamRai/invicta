// src/lib/seed-direct.js

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

const matches = [
  {
    id: "match-001",
    teamA: "Phoenix FC",
    teamB: "Thunder Hawks",
    sport: "Football",
    type: "Group Stage",
    scoreA: 2,
    scoreB: 1,
    status: "Live",
    time: "14:00",
  },
  {
    id: "match-002",
    teamA: "Storm Riders",
    teamB: "Iron Wolves",
    sport: "Volleyball",
    type: "Knockout",
    scoreA: 1,
    scoreB: 0,
    status: "Live",
    time: "15:30",
  },
  {
    id: "match-003",
    teamA: "Golden Eagles",
    teamB: "Silver Foxes",
    sport: "Cricket",
    type: "Group Stage",
    scoreA: 0,
    scoreB: 0,
    status: "Upcoming",
    time: "17:00",
  },
  {
    id: "match-004",
    teamA: "Blue Arrows",
    teamB: "Red Titans",
    sport: "Badminton",
    type: "Semi-Final",
    scoreA: 21,
    scoreB: 18,
    status: "Finished",
    time: "10:00",
  },
  {
    id: "match-005",
    teamA: "Night Owls",
    teamB: "Solar Bears",
    sport: "Table Tennis",
    type: "Quarter-Final",
    scoreA: 3,
    scoreB: 2,
    status: "Finished",
    time: "11:00",
  },
  {
    id: "match-006",
    teamA: "Blaze United",
    teamB: "Frost Giants",
    sport: "Football",
    type: "Group Stage",
    scoreA: 0,
    scoreB: 0,
    status: "Upcoming",
    time: "19:00",
  }
];

async function seed() {
  console.log("Loading Firebase SDKs...");
  const { initializeApp } = await import("firebase/app");
  const { getFirestore, doc, setDoc } = await import("firebase/firestore");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Seeding direct matches data to Firestore...");
  
  for (const match of matches) {
    const matchData = {
      id: match.id,
      teamA: match.teamA,
      teamB: match.teamB,
      sport: match.sport,
      type: match.type,
      scoreA: match.scoreA || 0,
      scoreB: match.scoreB || 0,
      status: match.status,
      time: match.time || "TBD",
      timer: "00:00",
      elapsedSeconds: 0,
      clockRunning: false,
      period: match.status === "Finished" ? "Full Time" : "First Half",
      lastUpdated: Date.now(),
      announcements: [],
      scoreEvents: []
    };

    console.log(`Writing match: ${match.teamA} vs ${match.teamB}...`);
    await setDoc(doc(db, "matches", match.id), matchData);
  }

  console.log("SUCCESS: 6 Matches have been successfully seeded to Firestore!");
  process.exit(0);
}

seed().catch(err => {
  console.error("CRITICAL SEEDING ERROR:", err);
  process.exit(1);
});
