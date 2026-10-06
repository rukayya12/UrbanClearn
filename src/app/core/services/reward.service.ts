import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserRewards, RewardTransaction } from '../models/index';
import { RewardItem, RewardStatus, INITIAL_REWARDS, generateNextRewardId } from '../models/reward.model';

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  // Reward items catalog
  private rewardItemsSubject = new BehaviorSubject<RewardItem[]>(this.getRewardItemsFromStorage());
  public rewardItems$ = this.rewardItemsSubject.asObservable();

  // User rewards and points
  private rewardsSubject = new BehaviorSubject<UserRewards[]>(this.getRewardsFromStorage());
  public rewards$ = this.rewardsSubject.asObservable();

  constructor() {
    this.initializeRewardCatalog();
    this.initializeRewards();
  }

  // ==========================================
  // 1. Reward Items Catalog Management (Admin)
  // ==========================================

  private initializeRewardCatalog(): void {
    const items = this.getRewardItemsFromStorage();
    if (items.length === 0) {
      localStorage.setItem('urbanclean_reward_items', JSON.stringify(INITIAL_REWARDS));
      this.rewardItemsSubject.next([...INITIAL_REWARDS]);
    }
  }

  getAllRewards(): RewardItem[] {
    return this.getRewardItemsFromStorage();
  }

  getActiveRewards(): RewardItem[] {
    return this.getAllRewards().filter(r => r.status === 'Active');
  }

  getRewardById(id: string): RewardItem | undefined {
    return this.getAllRewards().find(r => r.id === id);
  }

  addReward(data: {
    name: string;
    description: string;
    pointsRequired: number;
    status?: RewardStatus;
    category?: string;
  }): RewardItem {
    const items = this.getAllRewards();
    const nextId = generateNextRewardId(items);
    const now = new Date();

    const newReward: RewardItem = {
      id: nextId,
      name: (data.name || '').trim(),
      description: (data.description || '').trim(),
      pointsRequired: Number(data.pointsRequired) || 0,
      status: data.status || 'Active',
      category: data.category || 'Service',
      createdAt: now,
      updatedAt: now
    };

    items.push(newReward);
    this.saveRewardItems(items);
    return newReward;
  }

  updateReward(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      pointsRequired: number;
      status: RewardStatus;
      category: string;
    }>
  ): boolean {
    const items = this.getAllRewards();
    const index = items.findIndex(r => r.id === id);

    if (index === -1) {
      return false;
    }

    const current = items[index];
    items[index] = {
      ...current,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      description: updates.description !== undefined ? updates.description.trim() : current.description,
      pointsRequired: updates.pointsRequired !== undefined ? Number(updates.pointsRequired) : current.pointsRequired,
      status: updates.status || current.status,
      updatedAt: new Date()
    };

    this.saveRewardItems(items);
    return true;
  }

  toggleRewardStatus(id: string): boolean {
    const items = this.getAllRewards();
    const item = items.find(r => r.id === id);

    if (!item) {
      return false;
    }

    item.status = item.status === 'Active' ? 'Inactive' : 'Active';
    item.updatedAt = new Date();
    this.saveRewardItems(items);
    return true;
  }

  deleteReward(id: string): boolean {
    const items = this.getAllRewards();
    const filtered = items.filter(r => r.id !== id);

    if (filtered.length === items.length) {
      return false;
    }

    this.saveRewardItems(filtered);
    return true;
  }

  getRewardsCatalogStats(): {
    total: number;
    active: number;
    inactive: number;
    minPoints: number;
    maxPoints: number;
  } {
    const items = this.getAllRewards();
    const active = items.filter(i => i.status === 'Active').length;
    const inactive = items.filter(i => i.status === 'Inactive').length;
    const points = items.map(i => i.pointsRequired);

    return {
      total: items.length,
      active,
      inactive,
      minPoints: points.length > 0 ? Math.min(...points) : 0,
      maxPoints: points.length > 0 ? Math.max(...points) : 0
    };
  }

  private getRewardItemsFromStorage(): RewardItem[] {
    const stored = localStorage.getItem('urbanclean_reward_items');
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveRewardItems(items: RewardItem[]): void {
    localStorage.setItem('urbanclean_reward_items', JSON.stringify(items));
    this.rewardItemsSubject.next([...items]);
  }

  // ==========================================
  // 2. User Rewards & Green Points Management
  // ==========================================

  private initializeRewards(): void {
    const rewards = this.getRewardsFromStorage();
    if (rewards.length === 0) {
      const mockRewards: UserRewards[] = [
        {
          userId: 'user-001',
          totalPoints: 150,
          currentMonthPoints: 50,
          tier: 'silver',
          transactionHistory: [
            {
              id: 'trans-001',
              userId: 'user-001',
              points: 10,
              type: 'earn',
              description: 'Completed waste collection request',
              createdAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              id: 'trans-002',
              userId: 'user-001',
              points: 5,
              type: 'earn',
              description: 'Bonus for on-time completion',
              createdAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)
            }
          ],
          redeemHistory: []
        }
      ];
      localStorage.setItem('urbanclean_rewards', JSON.stringify(mockRewards));
      this.rewardsSubject.next(mockRewards);
    }
  }

  getUserRewards(userId: string): UserRewards | undefined {
    const rewards = this.getRewardsFromStorage();
    let userRewards = rewards.find(r => r.userId === userId);

    if (!userRewards) {
      userRewards = {
        userId,
        totalPoints: 0,
        currentMonthPoints: 0,
        tier: 'bronze',
        transactionHistory: [],
        redeemHistory: []
      };
      rewards.push(userRewards);
      localStorage.setItem('urbanclean_rewards', JSON.stringify(rewards));
      this.rewardsSubject.next(rewards);
    }

    return userRewards;
  }

  getUserPoints(userId: string): number {
    return this.getUserRewards(userId)?.totalPoints || 0;
  }

  addPoints(userId: string, points: number, description: string): void {
    const rewards = this.getRewardsFromStorage();
    let userRewards = rewards.find(r => r.userId === userId);

    if (!userRewards) {
      userRewards = {
        userId,
        totalPoints: 0,
        currentMonthPoints: 0,
        tier: 'bronze',
        transactionHistory: [],
        redeemHistory: []
      };
      rewards.push(userRewards);
    }

    const transaction: RewardTransaction = {
      id: `trans-${Date.now()}`,
      userId,
      points,
      type: 'earn',
      description,
      createdAt: new Date()
    };

    userRewards.totalPoints += points;
    userRewards.currentMonthPoints += points;
    userRewards.transactionHistory.push(transaction);
    userRewards.tier = this.calculateTier(userRewards.totalPoints);

    localStorage.setItem('urbanclean_rewards', JSON.stringify(rewards));
    this.rewardsSubject.next(rewards);
  }

  deductPoints(userId: string, points: number, description: string): boolean {
    const rewards = this.getRewardsFromStorage();
    const userRewards = rewards.find(r => r.userId === userId);

    if (!userRewards || userRewards.totalPoints < points) {
      return false;
    }

    const transaction: RewardTransaction = {
      id: `trans-${Date.now()}`,
      userId,
      points,
      type: 'redeem',
      description,
      createdAt: new Date()
    };

    userRewards.totalPoints -= points;
    userRewards.currentMonthPoints -= Math.min(points, userRewards.currentMonthPoints);
    userRewards.transactionHistory.push(transaction);
    userRewards.tier = this.calculateTier(userRewards.totalPoints);

    localStorage.setItem('urbanclean_rewards', JSON.stringify(rewards));
    this.rewardsSubject.next(rewards);

    return true;
  }

  redeemReward(userId: string, rewardIdOrPoints: string | number, rewardName?: string): {
    success: boolean;
    message: string;
  } {
    let cost = 0;
    let name = '';

    if (typeof rewardIdOrPoints === 'string') {
      const rewardItem = this.getRewardById(rewardIdOrPoints);
      if (!rewardItem) {
        return { success: false, message: 'Reward item not found.' };
      }
      if (rewardItem.status !== 'Active') {
        return { success: false, message: 'This reward is currently inactive.' };
      }
      cost = rewardItem.pointsRequired;
      name = rewardItem.name;
    } else {
      cost = rewardIdOrPoints;
      name = rewardName || 'Eco Reward';
    }

    const currentPoints = this.getUserPoints(userId);
    if (currentPoints < cost) {
      return {
        success: false,
        message: `Insufficient Green Points. Required: ${cost}, Available: ${currentPoints}.`
      };
    }

    const deducted = this.deductPoints(userId, cost, `Redeemed: ${name}`);
    if (!deducted) {
      return { success: false, message: 'Failed to process redemption.' };
    }

    const rewards = this.getRewardsFromStorage();
    const userRewards = rewards.find(r => r.userId === userId);

    if (userRewards) {
      if (!userRewards.redeemHistory) {
        userRewards.redeemHistory = [];
      }
      userRewards.redeemHistory.push({
        redeemedPoints: cost,
        rewardName: name,
        redeemDate: new Date()
      });
      localStorage.setItem('urbanclean_rewards', JSON.stringify(rewards));
      this.rewardsSubject.next(rewards);
    }

    return {
      success: true,
      message: `Successfully redeemed ${name} for ${cost} Green Points!`
    };
  }

  getTransactionHistory(userId: string): RewardTransaction[] {
    const userRewards = this.getUserRewards(userId);
    return userRewards?.transactionHistory || [];
  }

  getStats(): {
    totalRewards: number;
    averagePerUser: number;
    topUser?: { userId: string; points: number };
  } {
    const rewards = this.getRewardsFromStorage();
    const totalRewards = rewards.reduce((sum, r) => sum + r.totalPoints, 0);
    const averagePerUser = rewards.length > 0 ? totalRewards / rewards.length : 0;
    const topUser = rewards.reduce((top, r) => r.totalPoints > (top?.points || 0) ? r : top, null as any);

    return {
      totalRewards,
      averagePerUser,
      topUser: topUser ? { userId: topUser.userId, points: topUser.totalPoints } : undefined
    };
  }

  private calculateTier(points: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (points >= 300) return 'platinum';
    if (points >= 200) return 'gold';
    if (points >= 100) return 'silver';
    return 'bronze';
  }

  private getRewardsFromStorage(): UserRewards[] {
    const stored = localStorage.getItem('urbanclean_rewards');
    return stored ? JSON.parse(stored) : [];
  }
}

