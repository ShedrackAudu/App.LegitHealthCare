export const SECTIONS = [
  { id: 'DCP', name: 'DCP Section' },
  { id: 'DCT', name: 'DCT Section' },
] as const;

export const YEARS = Array.from({ length: 11 }, (_, i) => (2025 + i).toString());

export type SectionID = (typeof SECTIONS)[number]['id'];
