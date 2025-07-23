import { ServiceType } from "@/lib/types/estimate-types";

export const BASE_LABOR_RATE = 35; // per hour
export const BASE_MATERIAL_MARKUP = 1.3; // 30% markup

export const CREW_SIZES: Record<ServiceType, number> = {
  WC: 2,
  PW: 2,
  SW: 2,
  BF: 2,
  GR: 1,
  FR: 1,
  HD: 3,
  FC: 4,
  GRC: 2,
  PWS: 3,
  PD: 4,
};

export const PRODUCTION_RATES: Record<ServiceType, number> = {
  WC: 150,
  PW: 800,
  SW: 600,
  BF: 200,
  GR: 50,
  FR: 30,
  HD: 1200,
  FC: 2000,
  GRC: 100,
  PWS: 400,
  PD: 1500,
};

export const MATERIAL_RATES: Record<ServiceType, number> = {
  WC: 0.15,
  PW: 0.08,
  SW: 0.12,
  BF: 0.25,
  GR: 2.5,
  FR: 1.8,
  HD: 0.05,
  FC: 0.1,
  GRC: 0.45,
  PWS: 0.35,
  PD: 0.12,
};

export const EQUIPMENT_TYPES: Record<ServiceType, string> = {
  WC: "cleaning",
  PW: "pressure",
  SW: "pressure",
  BF: "specialized",
  GR: "restoration",
  FR: "restoration",
  HD: "access",
  FC: "cleaning",
  GRC: "specialized",
  PWS: "pressure",
  PD: "heavy-duty",
};
