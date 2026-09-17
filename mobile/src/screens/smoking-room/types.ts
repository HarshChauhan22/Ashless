export interface SmokingProfileClient {
  id: string;
  brandLabel: string;
  pricingMode: "pack" | "single_stick";
  packPricePaise: string | null;
  packSize: number | null;
  costPerStickPaise: string;
  isPrimary: boolean;
  lastUsedAt: string | null;
}
