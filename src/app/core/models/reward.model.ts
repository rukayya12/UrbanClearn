export type RewardStatus = 'Active' | 'Inactive';

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  status: RewardStatus;
  category?: 'Service' | 'Voucher' | 'Shopping' | 'Community' | 'Other' | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export const INITIAL_REWARDS: RewardItem[] = [
  {
    id: 'REW01',
    name: 'Free Waste Collection',
    description: 'Get one free on-demand scheduled waste collection pickup.',
    pointsRequired: 50,
    status: 'Active',
    category: 'Service',
    createdAt: new Date('2026-01-01')
  },
  {
    id: 'REW02',
    name: 'Recycling Voucher',
    description: 'Voucher for eco-friendly recycling centre processing and packaging discounts.',
    pointsRequired: 100,
    status: 'Active',
    category: 'Voucher',
    createdAt: new Date('2026-01-02')
  },
  {
    id: 'REW03',
    name: 'Eco Shopping Voucher',
    description: 'Discount voucher for partnered sustainable grocery and zero-waste stores in Zanzibar.',
    pointsRequired: 150,
    status: 'Active',
    category: 'Shopping',
    createdAt: new Date('2026-01-03')
  },
  {
    id: 'REW04',
    name: 'Tree Planting Reward',
    description: 'Sponsor an indigenous mangrove tree planting initiative in Zanzibar.',
    pointsRequired: 200,
    status: 'Active',
    category: 'Community',
    createdAt: new Date('2026-01-04')
  }
];

/**
 * Generates the next sequential Reward ID: REW01, REW02, REW03, ...
 */
export function generateNextRewardId(existing: { id?: string }[] = []): string {
  const ids = existing
    .map(r => r.id || '')
    .filter(id => /^REW\d+$/i.test(id));

  let max = 0;
  for (const id of ids) {
    const num = parseInt(id.replace(/^REW/i, ''), 10);
    if (!isNaN(num) && num > max) {
      max = num;
    }
  }

  const next = max + 1;
  const pad = next < 10 ? `0${next}` : `${next}`;
  return `REW${pad}`;
}
