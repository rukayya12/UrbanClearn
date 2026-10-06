import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RewardService } from '../../../core/services/reward.service';
import { RewardItem, RewardStatus } from '../../../core/models/reward.model';

@Component({
  selector: 'app-admin-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rewards.component.html',
  styleUrls: ['./rewards.component.scss']
})
export class RewardsComponent implements OnInit, OnDestroy {
  rewards: RewardItem[] = [];
  filteredRewards: RewardItem[] = [];

  // Search & Filter
  searchTerm: string = '';
  statusFilter: 'ALL' | 'Active' | 'Inactive' = 'ALL';

  // Stats
  stats = {
    total: 0,
    active: 0,
    inactive: 0,
    minPoints: 0,
    maxPoints: 0
  };

  // Add / Edit Modal state
  showModal: boolean = false;
  isEditing: boolean = false;
  editingId: string | null = null;
  formModel = {
    name: '',
    description: '',
    pointsRequired: 50 as number | null,
    status: 'Active' as RewardStatus,
    category: 'Service'
  };
  formErrors: { name?: string; description?: string; pointsRequired?: string } = {};

  // Delete Confirmation state
  showDeleteConfirm: boolean = false;
  rewardToDelete: RewardItem | null = null;

  // Toast message
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  private sub = new Subscription();

  constructor(private rewardService: RewardService) {}

  ngOnInit(): void {
    this.loadData();
    this.sub.add(
      this.rewardService.rewardItems$.subscribe(() => {
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
    this.rewards = this.rewardService.getAllRewards();
    this.stats = this.rewardService.getRewardsCatalogStats();
    this.applyFilters();
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let res = [...this.rewards];

    // 1. Status filter
    if (this.statusFilter !== 'ALL') {
      res = res.filter(r => r.status === this.statusFilter);
    }

    // 2. Search query (Reward ID, Name, Description, Status)
    if (term) {
      res = res.filter(r => {
        const idMatch = (r.id || '').toLowerCase().includes(term);
        const nameMatch = (r.name || '').toLowerCase().includes(term);
        const descMatch = (r.description || '').toLowerCase().includes(term);
        const statusMatch = (r.status || '').toLowerCase().includes(term);
        const catMatch = (r.category || '').toLowerCase().includes(term);
        return idMatch || nameMatch || descMatch || statusMatch || catMatch;
      });
    }

    this.filteredRewards = res;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setStatusFilter(status: 'ALL' | 'Active' | 'Inactive'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.applyFilters();
  }

  // ==========================
  // Modal: Add / Edit Reward
  // ==========================

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.formModel = {
      name: '',
      description: '',
      pointsRequired: 50,
      status: 'Active',
      category: 'Service'
    };
    this.formErrors = {};
    this.showModal = true;
  }

  openEditModal(reward: RewardItem): void {
    this.isEditing = true;
    this.editingId = reward.id;
    this.formModel = {
      name: reward.name,
      description: reward.description,
      pointsRequired: reward.pointsRequired,
      status: reward.status,
      category: reward.category || 'Service'
    };
    this.formErrors = {};
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingId = null;
    this.formErrors = {};
  }

  validateForm(): boolean {
    this.formErrors = {};
    let valid = true;

    if (!this.formModel.name || !this.formModel.name.trim()) {
      this.formErrors.name = 'Reward name is required.';
      valid = false;
    }

    if (!this.formModel.description || !this.formModel.description.trim()) {
      this.formErrors.description = 'Description is required.';
      valid = false;
    }

    if (
      this.formModel.pointsRequired === null ||
      this.formModel.pointsRequired === undefined ||
      isNaN(this.formModel.pointsRequired) ||
      this.formModel.pointsRequired <= 0
    ) {
      this.formErrors.pointsRequired = 'Green Points required must be a valid positive number.';
      valid = false;
    }

    return valid;
  }

  saveReward(): void {
    if (!this.validateForm()) {
      return;
    }

    if (this.isEditing && this.editingId) {
      const updated = this.rewardService.updateReward(this.editingId, {
        name: this.formModel.name,
        description: this.formModel.description,
        pointsRequired: Number(this.formModel.pointsRequired),
        status: this.formModel.status,
        category: this.formModel.category
      });

      if (updated) {
        this.showToast(`Reward ${this.editingId} updated successfully!`, 'success');
        this.closeModal();
      } else {
        this.showToast('Failed to update reward.', 'error');
      }
    } else {
      const created = this.rewardService.addReward({
        name: this.formModel.name,
        description: this.formModel.description,
        pointsRequired: Number(this.formModel.pointsRequired),
        status: this.formModel.status,
        category: this.formModel.category
      });

      this.showToast(`Reward ${created.id} created successfully!`, 'success');
      this.closeModal();
    }
  }

  // ==========================
  // Toggle Status
  // ==========================

  toggleStatus(reward: RewardItem): void {
    const success = this.rewardService.toggleRewardStatus(reward.id);
    if (success) {
      const newStatus = reward.status === 'Active' ? 'Inactive' : 'Active';
      this.showToast(`Reward ${reward.id} status changed to ${newStatus}.`, 'success');
    }
  }

  // ==========================
  // Delete Reward
  // ==========================

  openDeleteConfirm(reward: RewardItem): void {
    this.rewardToDelete = reward;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.rewardToDelete = null;
  }

  confirmDelete(): void {
    if (!this.rewardToDelete) return;

    const id = this.rewardToDelete.id;
    const name = this.rewardToDelete.name;
    const deleted = this.rewardService.deleteReward(id);

    if (deleted) {
      this.showToast(`Reward ${id} (${name}) deleted successfully.`, 'success');
    } else {
      this.showToast('Failed to delete reward.', 'error');
    }

    this.closeDeleteConfirm();
  }

  // ==========================
  // Toast Helper
  // ==========================

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
    }, 3500);
  }
}
