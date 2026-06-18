/**
 * Deterministic avatar and nickname generator.
 * Generates stable cute nicknames and emojis based on a unique user/connection ID.
 * Fully offline, lightweight, and zero-dependency.
 */

const ADJECTIVES = [
  "Glitch",
  "Cosmic",
  "Neon",
  "Pastel",
  "Mumble",
  "Warm",
  "Cozy",
  "Retro",
  "Tactile",
  "Sonic",
  "Fuzzy",
  "Spooky",
  "Solar",
  "Lunar",
  "Mellow",
  "Zen",
  "Speedy",
  "Sleepy",
  "Funky",
  "Bouncing",
  "Juicy",
  "Sovereign",
  "Vampire",
  "Demoscene",
  "Analog",
];

const ANIMALS = [
  "Koala",
  "Platypus",
  "Goanna",
  "Wombat",
  "Echidna",
  "Quokka",
  "Possum",
  "Wallaby",
  "Kangaroo",
  "Bilby",
  "Octopus",
  "Fox",
  "Panda",
  "Badger",
  "Otter",
  "Axolotl",
  "Capybara",
  "Ferret",
  "Hedgehog",
  "Sloth",
  "Mascot",
  "Goat",
  "Dolphin",
  "Badger",
  "Owl",
];

const EMOJIS = [
  "🐨",
  "🦆",
  "🦎",
  "🦘",
  "🦔",
  "🐹",
  "🐱",
  "🦊",
  "🦁",
  "🐼",
  "🐙",
  "🦦",
  "🦥",
  "🦉",
  "🐧",
  "🐸",
  "🦑",
  "🛸",
  "🤖",
  "🎨",
  "🌈",
  "🧙",
  "🎸",
  "👾",
  "🧠",
];

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export interface DeterministicUser {
  nickname: string;
  emoji: string;
  color: string;
}

/**
 * Deterministically generates user profile from an ID string
 */
export function getDeterministicUser(id: string): DeterministicUser {
  if (!id) {
    return { nickname: "Anonymous Guest", emoji: "👤", color: "#999999" };
  }

  const hash = djb2Hash(id);
  const adj = ADJECTIVES[hash % ADJECTIVES.length];
  const animal = ANIMALS[hash % ANIMALS.length];
  const emoji = EMOJIS[hash % EMOJIS.length];

  // Palette of soft pastel-punk colors
  const palette = [
    "#E8839C", // Pink
    "#FFD9B8", // Peach
    "#A8D8EA", // Mint
    "#D4B5F7", // Lavender
    "#FFF44F", // Yellow
    "#5B8DEF", // Blue
    "#52A37F", // Sage Green
    "#C47C48", // Terracotta
  ];
  const color = palette[hash % palette.length];

  return {
    nickname: `${adj} ${animal}`,
    emoji,
    color,
  };
}
