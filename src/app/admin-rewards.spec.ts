import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { RewardService } from './core/services/reward.service';
import { RequestService } from './core/services/request.service';
import { LocationService } from './core/services/location.service';
import { UserService } from './core/services/user.service';
import { NotificationService } from './core/services/notification.service';
import { AdminGuard, UserGuard } from './core/guards/auth.guard';
import { RewardsComponent as AdminRewardsComponent } from './features/admin/rewards/rewards.component';
import { UserRewardsComponent } from './features/user/rewards/user-rewards.component';

describe('UrbanClean — Admin Rewards Feature (CRUD, Search, Status, Role Guard, User View)', () => {
  let authService: AuthService;
  let rewardService: RewardService;
  let requestService: RequestService;
  let userService: UserService;
  let locationService: LocationService;
  let notificationService: NotificationService;
  let adminGuard: AdminGuard;
  let userGuard: UserGuard;
  let mockRouter: any;
  let navigatedUrl = '';

  beforeEach(() => {
    localStorage.clear();
    navigatedUrl = '';
    mockRouter = {
      navigate: (commands: any[]) => {
        navigatedUrl = commands.join('/');
        return Promise.resolve(true);
      },
      url: '/admin/rewards'
    };

    authService = new AuthService();
    rewardService = new RewardService();
    locationService = new LocationService();
    userService = new UserService(authService);
    notificationService = new NotificationService();
    requestService = new RequestService(locationService, authService, userService, notificationService);

    adminGuard = new AdminGuard(authService, mockRouter);
    userGuard = new UserGuard(authService, mockRouter);
  });

  it('Admin Rewards: List initial default rewards (REW01 to REW04) and calculate stats', () => {
    const adminComp = new AdminRewardsComponent(rewardService);
    adminComp.ngOnInit();

    expect(adminComp.rewards.length).toBe(4);
    expect(adminComp.rewards[0].id).toBe('REW01');
    expect(adminComp.rewards[0].name).toBe('Free Waste Collection');
    expect(adminComp.rewards[0].pointsRequired).toBe(50);
    expect(adminComp.rewards[0].status).toBe('Active');

    expect(adminComp.rewards[1].id).toBe('REW02');
    expect(adminComp.rewards[1].name).toBe('Recycling Voucher');
    expect(adminComp.rewards[2].id).toBe('REW03');
    expect(adminComp.rewards[3].id).toBe('REW04');

    expect(adminComp.stats.total).toBe(4);
    expect(adminComp.stats.active).toBe(4);
    expect(adminComp.stats.inactive).toBe(0);
  });

  it('Admin Rewards: Add a new reward with sequential ID generation (REW05) and form validation', () => {
    const adminComp = new AdminRewardsComponent(rewardService);
    adminComp.ngOnInit();

    // Open Add Modal
    adminComp.openAddModal();
    expect(adminComp.showModal).toBe(true);
    expect(adminComp.isEditing).toBe(false);

    // Test Validation: Empty fields should fail
    adminComp.formModel.name = '';
    adminComp.formModel.description = '';
    adminComp.formModel.pointsRequired = 0;
    adminComp.saveReward();
    expect(adminComp.formErrors.name).toBeDefined();
    expect(adminComp.formErrors.description).toBeDefined();
    expect(adminComp.formErrors.pointsRequired).toBeDefined();

    // Fill valid data
    adminComp.formModel.name = 'Solar Energy Discount';
    adminComp.formModel.description = 'Get 10% discount on partnered clean solar energy installation.';
    adminComp.formModel.pointsRequired = 300;
    adminComp.formModel.category = 'Service';
    adminComp.formModel.status = 'Active';

    adminComp.saveReward();
    expect(adminComp.showModal).toBe(false);

    // Confirm reward added
    expect(adminComp.rewards.length).toBe(5);
    const added = adminComp.rewards.find(r => r.id === 'REW05');
    expect(added).toBeDefined();
    expect(added?.name).toBe('Solar Energy Discount');
    expect(added?.pointsRequired).toBe(300);

    // Verify localStorage persistence
    const raw = JSON.parse(localStorage.getItem('urbanclean_reward_items') || '[]');
    expect(raw.length).toBe(5);
    expect(raw[4].id).toBe('REW05');
  });

  it('Admin Rewards: Edit existing reward and save updates', () => {
    const adminComp = new AdminRewardsComponent(rewardService);
    adminComp.ngOnInit();

    const rew02 = adminComp.rewards.find(r => r.id === 'REW02')!;
    adminComp.openEditModal(rew02);
    expect(adminComp.showModal).toBe(true);
    expect(adminComp.isEditing).toBe(true);
    expect(adminComp.editingId).toBe('REW02');
    expect(adminComp.formModel.name).toBe('Recycling Voucher');

    // Modify details
    adminComp.formModel.name = 'Super Recycling Voucher';
    adminComp.formModel.pointsRequired = 120;
    adminComp.saveReward();
    expect(adminComp.showModal).toBe(false);

    const updated = rewardService.getRewardById('REW02');
    expect(updated?.name).toBe('Super Recycling Voucher');
    expect(updated?.pointsRequired).toBe(120);
  });

  it('Admin Rewards: Toggle status between Active and Inactive', () => {
    const adminComp = new AdminRewardsComponent(rewardService);
    adminComp.ngOnInit();

    const rew01 = adminComp.rewards[0];
    expect(rew01.status).toBe('Active');

    adminComp.toggleStatus(rew01);
    expect(adminComp.rewards.find(r => r.id === 'REW01')?.status).toBe('Inactive');
    expect(rewardService.getRewardById('REW01')?.status).toBe('Inactive');

    const updatedRew01 = adminComp.rewards.find(r => r.id === 'REW01')!;
    adminComp.toggleStatus(updatedRew01);
    expect(adminComp.rewards.find(r => r.id === 'REW01')?.status).toBe('Active');
    expect(rewardService.getRewardById('REW01')?.status).toBe('Active');
  });

  it('Admin Rewards: Delete a reward with confirmation dialog', () => {
    const adminComp = new AdminRewardsComponent(rewardService);
    adminComp.ngOnInit();

    const rew04 = adminComp.rewards.find(r => r.id === 'REW04')!;
    adminComp.openDeleteConfirm(rew04);
    expect(adminComp.showDeleteConfirm).toBe(true);
    expect(adminComp.rewardToDelete?.id).toBe('REW04');

    // Confirm deletion
    adminComp.confirmDelete();
    expect(adminComp.showDeleteConfirm).toBe(false);

    expect(adminComp.rewards.length).toBe(3);
    expect(adminComp.rewards.some(r => r.id === 'REW04')).toBe(false);

    // Verify localStorage persistence
    const raw = JSON.parse(localStorage.getItem('urbanclean_reward_items') || '[]');
    expect(raw.length).toBe(3);
    expect(raw.some((r: any) => r.id === 'REW04')).toBe(false);
  });

  it('Admin Rewards: Search and filter by ID, Name, Description, Status and Empty State', () => {
    const adminComp = new AdminRewardsComponent(rewardService);
    adminComp.ngOnInit();

    // Search by ID
    adminComp.searchTerm = 'REW01';
    adminComp.onSearchChange();
    expect(adminComp.filteredRewards.length).toBe(1);
    expect(adminComp.filteredRewards[0].id).toBe('REW01');

    // Search by Name keyword
    adminComp.searchTerm = 'Voucher';
    adminComp.onSearchChange();
    expect(adminComp.filteredRewards.length).toBe(2); // Recycling Voucher & Eco Shopping Voucher

    // Search with no matching results
    adminComp.searchTerm = 'NON_EXISTENT_REWARD_999';
    adminComp.onSearchChange();
    expect(adminComp.filteredRewards.length).toBe(0);

    // Clear search
    adminComp.clearSearch();
    expect(adminComp.filteredRewards.length).toBe(4);
    expect(adminComp.searchTerm).toBe('');

    // Status filter
    adminComp.rewards[0].status = 'Inactive';
    rewardService.updateReward('REW01', { status: 'Inactive' });
    adminComp.setStatusFilter('Inactive');
    expect(adminComp.filteredRewards.length).toBe(1);

    adminComp.setStatusFilter('Active');
    expect(adminComp.filteredRewards.length).toBe(3);

    adminComp.setStatusFilter('ALL');
    expect(adminComp.filteredRewards.length).toBe(4);
  });

  it('Role Guard: Normal User is denied access to /admin/rewards and redirected to /user/dashboard', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Khadija Said',
        email: 'khadija@example.com',
        phone: '+255 777 333 444',
        location: 'Zanzibar City',
        password: 'Password123!'
      })
    );
    await firstValueFrom(authService.login('khadija@example.com', 'Password123!'));

    const canActivate = adminGuard.canActivate({} as any, { url: '/admin/rewards' } as any);
    expect(canActivate).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });

  it('Normal User Rewards: View active catalog, check points, and redeem reward', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Ali Juma',
        email: 'ali@example.com',
        phone: '+255 777 555 666',
        location: 'Stone Town, Zanzibar',
        password: 'Password123!'
      })
    );
    await firstValueFrom(authService.login('ali@example.com', 'Password123!'));

    // Award user 120 Green Points
    rewardService.addPoints('USER01', 120, 'Earned from waste collections');

    const userComp = new UserRewardsComponent(rewardService, authService, requestService);
    userComp.ngOnInit();

    expect(userComp.currentPoints).toBe(120);
    expect(userComp.activeRewards.length).toBe(4);

    // REW01 costs 50 pts -> can afford
    const rew01 = userComp.activeRewards.find(r => r.id === 'REW01')!;
    expect(userComp.canAfford(rew01)).toBe(true);

    // REW03 costs 150 pts -> cannot afford
    const rew03 = userComp.activeRewards.find(r => r.id === 'REW03')!;
    expect(userComp.canAfford(rew03)).toBe(false);

    // Redeem REW01
    userComp.openRedeemModal(rew01);
    expect(userComp.showRedeemModal).toBe(true);
    userComp.confirmRedeem();

    // Remaining points: 120 - 50 = 70 pts
    expect(userComp.currentPoints).toBe(70);
    expect(userComp.userRewards?.redeemHistory.length).toBe(1);
    expect(userComp.userRewards?.redeemHistory[0].rewardName).toBe('Free Waste Collection');
  });

  it('Unauthenticated user cannot access /admin/rewards and is redirected to /login', () => {
    authService.logout();
    const canActivate = adminGuard.canActivate({} as any, { url: '/admin/rewards' } as any);
    expect(canActivate).toBe(false);
    expect(navigatedUrl).toBe('/login');
  });
});
