import {
  AirVent,
  BedDouble,
  Building,
  Car,
  Castle,
  CookingPot,
  Dumbbell,
  Fence,
  Heater,
  Hotel,
  House,
  LayoutGrid,
  PawPrint,
  Sparkles,
  TreePalm,
  TreePine,
  Tv,
  WashingMachine,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export const PROPERTY_TYPE_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  apartment: Building,
  house: House,
  villa: TreePalm,
  hotel: Hotel,
  cabin: TreePine,
  castle: Castle,
  shared_room: BedDouble,
  other: Sparkles,
};

export const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  air_conditioning: AirVent,
  heating: Heater,
  kitchen: CookingPot,
  parking: Car,
  pool: WavesLadder,
  gym: Dumbbell,
  balcony: Fence,
  tv: Tv,
  washing_machine: WashingMachine,
  pets_allowed: PawPrint,
};

/** Custom, user-invented amenities. */
export const CUSTOM_AMENITY_ICON = Sparkles;
