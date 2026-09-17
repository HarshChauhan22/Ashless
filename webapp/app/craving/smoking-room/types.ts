export interface SmokingProfileClient {
  id: string;
  brandLabel: string;
  pricingMode: "pack" | "single_stick";
  packPricePaise: number | null;
  packSize: number | null;
  costPerStickPaise: number;
  isPrimary: boolean;
  lastUsedAt: string | null;
}
