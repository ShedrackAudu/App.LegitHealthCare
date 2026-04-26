export const SECTIONS = [
  { id: 'DCP', name: 'DCP' },
  { id: 'DCT', name: 'DCT' },
] as const;

export const YEARS = Array.from({ length: 11 }, (_, i) => (2025 + i).toString());

export type SectionID = (typeof SECTIONS)[number]['id'];
