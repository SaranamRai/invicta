import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Fixture from './models/Fixture.js';
import Team from './models/Team.js';

async function fixFixtures() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const fixtures = await Fixture.find({});
  let updated = 0;

  for (const f of fixtures) {
    let needsUpdate = false;
    
    // Check Team A
    if (f.teamA) {
      const tA = await Team.findById(f.teamA);
      if (tA && tA.teamName) {
        if (f.teamAName !== tA.teamName) {
          f.teamAName = tA.teamName;
          needsUpdate = true;
        }
        if (!f.matchTitle || f.matchTitle.includes(f.teamA.toString())) {
          // matchTitle might be ObjectID vs ObjectID, so we update it
          needsUpdate = true;
        }
      }
    }

    // Check Team B
    if (f.teamB) {
      const tB = await Team.findById(f.teamB);
      if (tB && tB.teamName) {
        if (f.teamBName !== tB.teamName) {
          f.teamBName = tB.teamName;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      f.matchTitle = `${f.teamAName || 'Team A'} vs ${f.teamBName || 'Team B'}`;
      await f.save();
      updated++;
      console.log(`Updated fixture ${f._id}: ${f.matchTitle}`);
    }
  }

  console.log(`Done. Updated ${updated} fixtures.`);
  process.exit(0);
}

fixFixtures().catch(console.error);
