export type PersonAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export const PERSON_AVATAR_SIZE_MAP: Record<PersonAvatarSize, { w: number; h: number }> = {
  xs: { w: 30, h: 36 },
  sm: { w: 40, h: 48 },
  md: { w: 55, h: 66 },
  lg: { w: 70, h: 84 },
  xl: { w: 95, h: 114 },
};

export const PERSON_AVATAR_ASPECT = 5 / 6;
