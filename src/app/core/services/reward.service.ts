import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserRewards, RewardTransaction } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  private rewardsSubject = new BehaviorSubject<UserRewards[]>(this.getRewardsFromStorage());
  public rewards$ = this.rewardsSubject.asObservable();

  constructor() {
    this.initializeRewards();
  }

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

  redeemReward(userId: string, points: number, rewardName: string): boolean {
    if (!this.deductPoints(userId, points, `Redeemed: ${rewardName}`)) {
      return false;
    }

    const rewards = this.getRewardsFromStorage();
    const userRewards = rewards.find(r => r.userId === userId);

    if (!userRewards) {
      return false;
    }

    userRewards.redeemHistory.push({
      redeemedPoints: points,
      rewardName,
      redeemDate: new Date()
    });

    localStorage.setItem('urbanclean_rewards', JSON.stringify(rewards));
    this.rewardsSubject.next(rewards);

    return true;
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
