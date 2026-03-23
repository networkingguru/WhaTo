#!/usr/bin/env node

/**
 * Seed Firebase with realistic session data for App Store screenshots.
 *
 * Usage:
 *   node scripts/seed-screenshots.js          — seed both sessions
 *   node scripts/seed-screenshots.js complete  — flip FWBK to "complete" for results screenshot
 *
 * Workflow:
 *   1. Run: node scripts/seed-screenshots.js
 *   2. Set sim location: Simulator > Features > Location > Custom > 37.7749, -122.4194
 *   3. In app: Join Group > code FWBK > screenshot the lobby
 *   4. Run: node scripts/seed-screenshots.js complete
 *      → App auto-navigates to results screen > screenshot
 *   5. For swipe screen: Back > Eat? > Decide Solo > screenshot
 */

require('dotenv').config();

const YELP_API_KEY = process.env.EXPO_PUBLIC_YELP_API_KEY;
const FIREBASE_DB_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

// San Francisco coordinates
const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

const PARTICIPANTS = {
  'device-maya':   { name: 'Maya',    joinedAt: Date.now() - 120000 },
  'device-james':  { name: 'James',   joinedAt: Date.now() - 90000  },
  'device-priya':  { name: 'Priya',   joinedAt: Date.now() - 60000  },
  'device-marcus': { name: 'Marcus',  joinedAt: Date.now() - 30000  },
};

async function fetchYelpRestaurants() {
  const params = new URLSearchParams({
    latitude: String(SF_LAT),
    longitude: String(SF_LNG),
    radius: '8047', // ~5 miles
    categories: 'restaurants',
    limit: '15',
    sort_by: 'rating',
  });

  const resp = await fetch(
    `https://api.yelp.com/v3/businesses/search?${params}`,
    { headers: { Authorization: `Bearer ${YELP_API_KEY}` } }
  );

  if (!resp.ok) {
    throw new Error(`Yelp API error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.businesses.map((biz) => ({
    id: biz.id,
    title: biz.name,
    subtitle: biz.categories.map((c) => c.title).join(', '),
    imageUrl: biz.image_url || null,
    rating: biz.rating,
    details: [
      biz.categories.map((c) => c.title).join(', '),
      biz.price ?? '',
      (biz.location.display_address || []).join(', '),
    ].filter(Boolean),
    sourceUrl: biz.url,
    meta: { source: 'yelp' },
  }));
}

function buildSession(cards, status) {
  const participants = {};
  const deviceIds = Object.keys(PARTICIPANTS);
  const isComplete = status === 'complete';

  // Exactly 1 unanimous match (multiple would trigger another round in live play)
  const unanimousCard = cards[0];
  // 3 majority matches — most but not all swiped right
  const majorityCards = [cards[1], cards[2], cards[3]];

  for (const [id, data] of Object.entries(PARTICIPANTS)) {
    const participant = { ...data, connected: true };

    if (isComplete) {
      participant.completed = true;
      const swipes = {};
      for (const card of cards) {
        if (card.id === unanimousCard.id) {
          swipes[card.id] = true;
        } else if (majorityCards.some((mc) => mc.id === card.id)) {
          swipes[card.id] = id !== deviceIds[3];
        } else {
          swipes[card.id] = Math.random() > 0.5;
        }
      }
      participant.swipes = swipes;
    }

    participants[id] = participant;
  }

  return {
    topic: 'food',
    status,
    createdBy: 'device-maya',
    createdAt: Date.now() - 120000,
    round: 1,
    location: { latitude: SF_LAT, longitude: SF_LNG, radiusMiles: 5 },
    cards,
    participants,
  };
}

async function writeToFirebase(path, data) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    throw new Error(`Firebase write error: ${resp.status} ${await resp.text()}`);
  }
}

async function flipToActive() {
  console.log('Flipping FWBK to "active"...');
  await writeToFirebase('sessions/FWBK/status', 'active');
  console.log('Done! App should navigate to group-swipe screen now.');
  console.log('Take your swipe screenshot, then run: node scripts/seed-screenshots.js complete');
}

async function flipToComplete() {
  console.log('Reading FWBK session from Firebase...');
  const url = `${FIREBASE_DB_URL}/sessions/FWBK.json`;
  const resp = await fetch(url);
  const session = await resp.json();

  if (!session) {
    console.error('No FWBK session found. Run the seed first.');
    process.exit(1);
  }

  // Add swipes to all participants (including any user who joined)
  const cards = session.cards || [];
  // Exactly 1 unanimous match (realistic — multiple would trigger another round)
  const unanimousCard = cards[0];
  const majorityCards = [cards[1], cards[2], cards[3]];
  const participantIds = Object.keys(session.participants || {});

  for (const [i, id] of participantIds.entries()) {
    const swipes = {};
    for (const card of cards) {
      if (card.id === unanimousCard.id) {
        // Everyone likes this one
        swipes[card.id] = true;
      } else if (majorityCards.some((mc) => mc.id === card.id)) {
        // Last participant doesn't like majority cards
        swipes[card.id] = i < participantIds.length - 1;
      } else {
        swipes[card.id] = Math.random() > 0.5;
      }
    }
    session.participants[id].completed = true;
    session.participants[id].swipes = swipes;
  }

  session.status = 'complete';

  await writeToFirebase('sessions/FWBK', session);
  console.log('FWBK session flipped to "complete" with swipe data.');
  console.log(`Unanimous match: ${unanimousCard?.title}`);
  console.log(`Majority matches: ${majorityCards.map((c) => c.title).join(', ')}`);
  console.log('App should auto-navigate to results screen now!');
}

async function seed() {
  console.log('Fetching SF restaurants from Yelp...');
  const cards = await fetchYelpRestaurants();
  console.log(`Got ${cards.length} restaurants\n`);

  console.log('Seeding FWBK session (lobby state)...');
  const session = buildSession(cards, 'waiting');
  await writeToFirebase('sessions/FWBK', session);
  console.log('  Participants:', Object.values(PARTICIPANTS).map(p => p.name).join(', '));

  console.log('\n--- Done! ---');
  console.log('\nScreenshot workflow:');
  console.log('  1. Set sim location: Simulator > Features > Location > Custom > 37.7749, -122.4194');
  console.log('  2. In app: Join Group > code FWBK > screenshot the LOBBY');
  console.log('  3. Run: node scripts/seed-screenshots.js active');
  console.log('     → App navigates to group-swipe > screenshot SWIPE');
  console.log('  4. Run: node scripts/seed-screenshots.js complete');
  console.log('     → App navigates to results > screenshot RESULTS');
  console.log('  5. For solo swipe: Back > Eat? > Decide Solo');
}

async function main() {
  const command = process.argv[2];

  if (command === 'active') {
    await flipToActive();
  } else if (command === 'complete') {
    await flipToComplete();
  } else {
    await seed();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
