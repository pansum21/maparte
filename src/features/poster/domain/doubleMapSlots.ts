import { getActivePosterLabels } from "@/features/poster/domain/textLayout";
import type { DoubleMapState, DoubleSlotData } from "@/features/poster/application/posterReducer";

export interface DoubleSlotView {
  city: string;
  country: string;
  lat: number;
  lon: number;
  distance: number;
  hasPlace: boolean;
}

interface FormSlice {
  location: string;
  latitude: string;
  longitude: string;
  distance: string;
  displayCity: string;
  displayTown?: string;
  displayCountry: string;
  displayState?: string;
  displayContinent: string;
}

function toView(slot: FormSlice): DoubleSlotView {
  // Double layouts always use the map's own names, one block per map.
  const { city, country } = getActivePosterLabels({
    textMode: "map",
    displayCity: slot.displayCity,
    displayTown: slot.displayTown,
    displayCountry: slot.displayCountry,
    displayState: slot.displayState,
  });
  const town = slot.displayTown?.trim();
  const title = [town && town !== city ? town : "", city].filter(Boolean).join(" · ");
  return {
    city: title,
    country,
    lat: Number(slot.latitude) || 0,
    lon: Number(slot.longitude) || 0,
    distance: Number(slot.distance) || 0,
    hasPlace: Boolean(slot.displayCity || slot.displayTown || slot.displayCountry),
  };
}

/** Both maps in poster order (index 0 = first map, 1 = second map). */
export function getDoubleSlotViews(form: FormSlice, doubleMap: DoubleMapState, count = 2): DoubleSlotView[] {
  const activeView = toView(form);
  return Array.from({ length: count }, (_, i) => i === doubleMap.active ? activeView : toView(doubleMap.slots[i] as DoubleSlotData));
}
