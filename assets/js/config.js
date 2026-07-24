// Values here are expected to change often — officers edit this file
// directly (no CMS, no admin form) rather than touching page logic.

// Placeholder events for this trial. Officers: edit this array directly.
// `id` is embedded in each event's QR code and used as the Firestore
// attendance doc ID, so keep it short, unique, and stable once an event's
// QR code has been printed/shared — changing an id after the fact orphans
// any check-ins already logged against the old one.
export const EVENTS = [
  {
    id: "fall-kickoff-mixer",
    name: "Fall Kickoff Mixer",
    date: "2026-08-25",
    location: "Student Commons, Bldg 200",
    description: "Meet fellow chapter members, grab free food, and find out what committees are forming this semester.",
  },
  {
    id: "induction-ceremony",
    name: "New Member Induction Ceremony",
    date: "2026-09-15",
    location: "Goode Theater",
    description: "Formal induction for newly invited members — cords, candles, and a whole lot of pride.",
  },
  {
    id: "volunteer-day-food-bank",
    name: "Volunteer Day: Community Food Bank",
    date: "2026-10-04",
    location: "Central Virginia Foodbank",
    description: "Half-day service shift sorting and packing donations. Counts toward Hallmark Award hours.",
  },
  {
    id: "study-jam-finals",
    name: "Finals Week Study Jam",
    date: "2026-12-08",
    location: "Library, 2nd Floor Study Rooms",
    description: "Snacks, a quiet co-working space, and peer tutors on hand for last-minute finals prep.",
  },
];

// Placeholder thresholds/prizes — exact numbers and prizes are still being
// finalized. Ordered ascending by threshold; My Passport reads this list
// rather than hardcoding numbers so real values can be swapped in later.
export const MILESTONES = [
  { threshold: 1, label: "First Stamp", badge: "🥉", prize: "Sticker pack (placeholder prize)" },
  { threshold: 3, label: "Regular", badge: "🥈", prize: "Chapter button (placeholder prize)" },
  { threshold: 6, label: "Champion", badge: "🥇", prize: "T-shirt (placeholder prize)" },
  { threshold: 10, label: "Hall of Fame", badge: "🏆", prize: "Prize TBD" },
];
