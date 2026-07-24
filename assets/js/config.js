// Values here are expected to change often — officers edit this file
// directly (no CMS, no admin form) rather than touching page logic.

// Events used to live here as a static array; they're now managed through
// the admin dashboard (/admin/events/) and stored in the `events` Firestore
// collection instead, so officers can add/edit them without touching code.
// Reference seed data for re-creating the original placeholders through
// that UI:
//
// fall-kickoff-mixer      | Fall Kickoff Mixer              | 2026-08-25 | Student Commons, Bldg 200      | Meet fellow chapter members, grab free food, and find out what committees are forming this semester.
// induction-ceremony      | New Member Induction Ceremony   | 2026-09-15 | Goode Theater                  | Formal induction for newly invited members — cords, candles, and a whole lot of pride.
// volunteer-day-food-bank | Volunteer Day: Community Food Bank | 2026-10-04 | Central Virginia Foodbank    | Half-day service shift sorting and packing donations. Counts toward Hallmark Award hours.
// study-jam-finals        | Finals Week Study Jam           | 2026-12-08 | Library, 2nd Floor Study Rooms | Snacks, a quiet co-working space, and peer tutors on hand for last-minute finals prep.

// Placeholder thresholds/prizes — exact numbers and prizes are still being
// finalized. Ordered ascending by threshold; My Passport reads this list
// rather than hardcoding numbers so real values can be swapped in later.
export const MILESTONES = [
  { threshold: 1, label: "First Stamp", badge: "🥉", prize: "Sticker pack (placeholder prize)" },
  { threshold: 3, label: "Regular", badge: "🥈", prize: "Chapter button (placeholder prize)" },
  { threshold: 6, label: "Champion", badge: "🥇", prize: "T-shirt (placeholder prize)" },
  { threshold: 10, label: "Hall of Fame", badge: "🏆", prize: "Prize TBD" },
];
