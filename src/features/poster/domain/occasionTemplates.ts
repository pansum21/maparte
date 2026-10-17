export interface OccasionTemplate {
  id: string;
  badge: string;
  title: string;
  tagline: string;
  themeId: string;
  fontFamily: string;
  cityText: string;
  countryText: string;
  markerIconId: string;
  markerColor?: string;
  description: string;
}

export const OCCASION_TEMPLATES: OccasionTemplate[] = [
  {
    id: "where_we_met",
    badge: "💕 Most Popular",
    title: "Where We Met",
    tagline: "Romantic anniversary & wedding gift",
    themeId: "midnight_blue",
    fontFamily: "Playfair Display",
    cityText: "WHERE WE MET",
    countryText: "FOREVER & ALWAYS • 14 FEB",
    markerIconId: "heart",
    description: "Deep midnight blue tones with classic serif font and a heart pinned right where your love story began.",
  },
  {
    id: "she_said_yes",
    badge: "💍 The Proposal",
    title: "She Said Yes",
    tagline: "Commemorate your engagement & proposal",
    themeId: "carrara",
    fontFamily: "Playfair Display",
    cityText: "SHE SAID YES",
    countryText: "THE PROPOSAL • WE SAID FOREVER",
    markerIconId: "ring",
    description: "Carrara white marble tones with timeless serif lettering and a diamond ring pin marking the proposal.",
  },
  {
    id: "our_wedding_day",
    badge: "🥂 Wedding Day",
    title: "Our Wedding Day",
    tagline: "Celebrate the day two souls united",
    themeId: "ruby",
    fontFamily: "Playfair Display",
    cityText: "MR & MRS",
    countryText: "OUR WEDDING DAY • TO HAVE & TO HOLD",
    markerIconId: "champagne",
    description: "Romantic ruby tones with elegant typography and celebratory champagne glasses at your venue.",
  },
  {
    id: "our_first_home",
    badge: "🏡 Housewarming",
    title: "Our First Home",
    tagline: "Celebrate a new home or family milestone",
    themeId: "sandstone",
    fontFamily: "Montserrat",
    cityText: "OUR FIRST HOME",
    countryText: "HOME SWEET HOME • EST. 2024",
    markerIconId: "home",
    description: "Warm neutral architectural tones and modern typography with a home pin at your exact address.",
  },
  {
    id: "travel_memories",
    badge: "✈️ Wanderlust",
    title: "Travel Memory",
    tagline: "Favorite city trip or study abroad journey",
    themeId: "terracotta",
    fontFamily: "Oswald",
    cityText: "MEMORIES OF A LIFETIME",
    countryText: "OUR GREATEST ADVENTURE",
    markerIconId: "star",
    description: "Burnt terracotta Mediterranean warmth and bold editorial headlines celebrating your favorite travel memories.",
  },
  {
    id: "marathon_race",
    badge: "🏃 Finisher",
    title: "Marathon & Race",
    tagline: "Commemorate a 42K, 21K, 10K or cycling challenge",
    themeId: "noir",
    fontFamily: "Bebas Neue",
    cityText: "FINISHER 42.195 KM",
    countryText: "SWEAT • DETERMINATION • GLORY",
    markerIconId: "pin",
    description: "High-contrast noir stealth styling with bold athletic typography for your greatest physical triumphs.",
  },
];
