import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RewardService } from '../../../core/services/reward.service';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { RewardItem } from '../../../core/models/reward.model';
import { UserRewards } from '../../../core/models/index';

@Component({
  selector: 'app-user-rewards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-rewards.component.html',
  styleUrls: ['./user-rewards.component.scss']
})
export class UserRewardsComponent implements OnInit, OnDestroy {
  activeRewards: RewardItem[] = [];
  userRewards?: UserRewards;
  currentPoints: number = 0;
  userTier: string = 'bronze';
  userId: string = '';
  userName: string = '';

  // Toast feedback
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  // Selected reward for redemption confirm
  selectedRewardForRedeem: RewardItem | null = null;
  showRedeemModal: boolean = false;

  private sub = new Subscription();

  constructor(
    private rewardService: RewardService,
    private authService: AuthService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userId = user.id;
      this.userName = user.fullName;
    }

    this.loadData();

    this.sub.add(
      this.rewardService.rewardItems$.subscribe(() => {
        this.loadData();
      })
    );

    this.sub.add(
      this.rewardService.rewards$.subscribe(() => {
        this.loadData();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  loadData(): void {
    this.activeRewards = this.rewardService.getActiveRewards();

    if (this.userId) {
      this.userRewards = this.rewardService.getUserRewards(this.userId);
      
      // Calculate dynamic points from completed requests + existing rewards
      const userRequests = this.requestService.getUserRequests(this.userId);
      const completedRequests = userRequests.filter(r => (r.status || '').toLowerCase() === 'completed');
      const earnedReqPoints = completedRequests.reduce((sum, r) => sum + (r.greenPoints || 10), 0);

      const storedPoints = this.userRewards?.totalPoints || 0;
      this.currentPoints = Math.max(storedPoints, earnedReqPoints);
      this.userTier = this.userRewards?.tier || 'bronze';
    }
  }

  openRedeemModal(reward: RewardItem): void {
    this.selectedRewardForRedeem = reward;
    this.showRedeemModal = true;
  }

  closeRedeemModal(): void {
    this.selectedRewardForRedeem = null;
    this.showRedeemModal = false;
  }

  confirmRedeem(): void {
    if (!this.selectedRewardForRedeem || !this.userId) return;

    const reward = this.selectedRewardForRedeem;
    const result = this.rewardService.redeemReward(this.userId, reward.id);

    if (result.success) {
      this.showToast(result.message, 'success');
      this.loadData();
    } else {
      this.showToast(result.message, 'error');
    }

    this.closeRedeemModal();
  }

  canAfford(reward: RewardItem): boolean {
    return this.currentPoints >= reward.pointsRequired;
  }

  getProgressPercent(reward: RewardItem): number {
    if (this.currentPoints >= reward.pointsRequired) return 100;
    if (reward.pointsRequired <= 0) return 0;
    return Math.round((this.currentPoints / reward.pointsRequired) * 100);
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }
}
