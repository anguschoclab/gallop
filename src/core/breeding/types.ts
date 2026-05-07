export type Pregnancy = {
  id: string;
  sireId: string;
  damId: string;
  sireName: string;
  damName: string;
  conceivedDay: number;
  dueDay: number;
  resolved: boolean;
  foalId?: string;
  stage?: "early" | "mid" | "late" | "delivered";
  earlyChecked?: boolean;
  midChecked?: boolean;
  twin?: boolean;
  liveFoalGuarantee?: boolean;
  reBreedingAttempts?: number;
  refunded?: boolean;
};

export type DosageProfile = {
  brilliant: number;
  intermediate: number;
  classic: number;
  solid: number;
  professional: number;
};

export type PedigreeNode = {
  horseId?: string;
  name: string;
  generation: number;
  aptitudinalGroup?: string;
};
