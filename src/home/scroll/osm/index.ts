import type { OsmCity } from "../osmTypes";

import jaipur from "./jaipur";
import kyoto from "./kyoto";
import lisbon from "./lisbon";
import portland from "./portland";
import reykjavik from "./reykjavik";
import buenosAires from "./buenos-aires";
import nairobi from "./nairobi";
import osaka from "./osaka";
import tbilisi from "./tbilisi";
import valparaiso from "./valparaiso";
import hanoi from "./hanoi";
import marrakesh from "./marrakesh";
import montreal from "./montreal";
import seoul from "./seoul";
import bristol from "./bristol";
import istanbul from "./istanbul";
import mexicoCity from "./mexico-city";
import copenhagen from "./copenhagen";
import capeTown from "./cape-town";
import sydney from "./sydney";

export const OSM: Record<string, OsmCity> = {
  "jaipur": jaipur,
  "kyoto": kyoto,
  "lisbon": lisbon,
  "portland": portland,
  "reykjavik": reykjavik,
  "buenos-aires": buenosAires,
  "nairobi": nairobi,
  "osaka": osaka,
  "tbilisi": tbilisi,
  "valparaiso": valparaiso,
  "hanoi": hanoi,
  "marrakesh": marrakesh,
  "montreal": montreal,
  "seoul": seoul,
  "bristol": bristol,
  "istanbul": istanbul,
  "mexico-city": mexicoCity,
  "copenhagen": copenhagen,
  "cape-town": capeTown,
  "sydney": sydney,
};

export const getOsm = (slug: string): OsmCity => {
  const city = OSM[slug];
  if (!city) throw new Error(`No baked OSM data for "${slug}"`);
  return city;
};
