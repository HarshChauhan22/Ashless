// Mirrors webapp/lib/jokes.ts exactly — same 10 jokes, same setup/punchline
// split for the tap-to-expand accordion (DECISIONS.md D-011/D-012).
export interface Joke {
  setup: string;
  punchline: string;
}

export const JOKES: Joke[] = [
  { setup: "Teacher: \"Homework kahaan hai?\"", punchline: "Student: \"Sir, woh craving ki tarah — bas aane wala tha, phir chala gaya.\"" },
  { setup: "I told my chai it needed to calm down.", punchline: "It didn't listen. Neither do I, most days." },
  { setup: "Auto driver: \"Seedha jaana hai?\"", punchline: "Me, mentally, about literally everything in life: \"Bhai, koshish kar raha hoon.\"" },
  { setup: "Why don't clouds ever get in trouble?", punchline: "They just float above everything — respect." },
  { setup: "My WiFi and my willpower have the same password.", punchline: "Works when nobody's testing it too hard." },
  { setup: "Momos ke bina meeting adhoori hai —", punchline: "but so is a lot of things. Meetings especially." },
  { setup: "I asked my plant for advice.", punchline: "It just stood there growing. Honestly, solid strategy." },
  { setup: "Traffic signal pe red light itni der tak rehti hai, phir bhi log jaldi mein rehte hain.", punchline: "Craving bhi kuch aisi hi hoti hai — bas wait karo." },
  { setup: "Two minutes of silence is either a tribute", punchline: "or my brain trying to remember why I walked into this room." },
  { setup: "The cat sat on the keyboard", punchline: "and somehow still typed a more useful sentence than my last work email." },
];
