import { Injectable } from '@angular/core';
import { Analytics } from '../models/index';
import { RequestService } from './request.service';
import { UserService } from './user.service';
import { WasteRequest } from '../models/request.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(
    private requestService: RequestService,
    private userService: UserService
  ) {}

  /**
   * Generate comprehensive analytics from request data
   */
  generateAnalytics(): Analytics {
    const requests = this.requestService.getAllRequests();
    const collectors = this.userService.getCollectors();

    const stats = this.requestService.getRequestsStats();
    const wasteDistribution = this.calculateWasteDistribution(requests);
    const requestsByStatus = this.calculateRequestsByStatus(requests);
    const collectorPerformance = this.calculateCollectorPerformance(requests, collectors);
    const requestsOverTime = this.calculateRequestsOverTime(requests);
    const recyclingRatio = this.calculateRecyclingRatio(requests);

    return {
      totalRequests: stats.total,
      completedRequests: stats.completed,
      pendingRequests: stats.pending,
      rejectedRequests: stats.rejected,
      wasteDistribution,
      requestsByStatus,
      collectorPerformance,
      requestsOverTime,
      recyclingRatio
    };
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): {
    totalRequests: number;
    completedToday: number;
    pendingRequests: number;
    averageCompletionTime: number;
    successRate: number;
  } {
    const requests = this.requestService.getAllRequests();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRequests = requests.filter(
      r => new Date(r.createdAt).getTime() >= today.getTime()
    );
    const completedToday = todayRequests.filter(r => r.status === 'completed').length;

    const completedRequests = requests.filter(r => r.status === 'completed');
    const totalCompletionTime = completedRequests.reduce((sum, r) => {
      if (r.completionTime) {
        return sum + (r.completionTime.getTime() - r.createdAt.getTime());
      }
      return sum;
    }, 0);

    const averageCompletionTime = completedRequests.length > 0
      ? Math.round(totalCompletionTime / completedRequests.length / (1000 * 60 * 60))
      : 0;

    const successRate = requests.length > 0
      ? Math.round((completedRequests.length / requests.length) * 100)
      : 0;

    return {
      totalRequests: requests.length,
      completedToday,
      pendingRequests: requests.filter(
        r => ['pending', 'received', 'scheduling'].includes(r.status)
      ).length,
      averageCompletionTime,
      successRate
    };
  }

  /**
   * Get requests over time for charting
   */
  getRequestsTimeSeries(days: number = 30): { date: string; count: number }[] {
    const requests = this.requestService.getAllRequests();
    const timeSeries: { [key: string]: number } = {};

    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      timeSeries[dateStr] = 0;
    }

    requests.forEach(req => {
      const dateStr = req.createdAt.toISOString().split('T')[0];
      if (timeSeries.hasOwnProperty(dateStr)) {
        timeSeries[dateStr]++;
      }
    });

    return Object.entries(timeSeries)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  }

  /**
   * Get collector rankings by performance
   */
  getCollectorRankings(limit: number = 10): Array<{
    collectorId: string;
    name: string;
    completedRequests: number;
    averageRating: number;
    efficiency: number;
  }> {
    const requests = this.requestService.getAllRequests();
    const collectors = this.userService.getCollectors();

    const collectorStats: { [key: string]: { name: string; completed: number; total: number } } = {};

    collectors.forEach(c => {
      collectorStats[c.id] = {
        name: c.fullName,
        completed: 0,
        total: 0
      };
    });

    requests.forEach(req => {
      if (req.collectorId && collectorStats[req.collectorId]) {
        collectorStats[req.collectorId].total++;
        if (req.status === 'completed') {
          collectorStats[req.collectorId].completed++;
        }
      }
    });

    return Object.entries(collectorStats)
      .map(([id, stats]) => ({
        collectorId: id,
        name: stats.name,
        completedRequests: stats.completed,
        averageRating: 4.5,
        efficiency: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.completedRequests - a.completedRequests)
      .slice(0, limit);
  }

  /**
   * Get waste type distribution
   */
  private calculateWasteDistribution(requests: WasteRequest[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};

    requests.forEach(req => {
      req.wasteTypes.forEach(type => {
        distribution[type] = (distribution[type] || 0) + 1;
      });
    });

    return distribution;
  }

  /**
   * Get requests by status
   */
  private calculateRequestsByStatus(requests: WasteRequest[]): { [key: string]: number } {
    const byStatus: { [key: string]: number } = {
      pending: 0,
      received: 0,
      processed: 0,
      scheduling: 0,
      accepted: 0,
      rejected: 0,
      completed: 0
    };

    requests.forEach(req => {
      if (byStatus.hasOwnProperty(req.status)) {
        byStatus[req.status]++;
      }
    });

    return byStatus;
  }

  /**
   * Calculate collector performance
   */
  private calculateCollectorPerformance(
    requests: WasteRequest[],
    collectors: any[]
  ): Array<{
    collectorId: string;
    name: string;
    completedRequests: number;
    averageRating: number;
    totalDistance: number;
  }> {
    const performance: { [key: string]: any } = {};

    collectors.forEach(c => {
      performance[c.id] = {
        collectorId: c.id,
        name: c.fullName,
        completedRequests: 0,
        averageRating: c.rating || 4.5,
        totalDistance: 0
      };
    });

    requests
      .filter(r => r.collectorId && r.status === 'completed')
      .forEach(req => {
        if (req.collectorId && performance[req.collectorId]) {
          performance[req.collectorId].completedRequests++;
        }
      });

    return Object.values(performance).sort((a, b) => b.completedRequests - a.completedRequests);
  }

  /**
   * Calculate requests over time
   */
  private calculateRequestsOverTime(requests: WasteRequest[]): { date: Date; count: number }[] {
    const timeMap: { [key: string]: number } = {};

    requests.forEach(req => {
      const date = new Date(req.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString();
      timeMap[key] = (timeMap[key] || 0) + 1;
    });

    return Object.entries(timeMap)
      .map(([date, count]) => ({ date: new Date(date), count }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate recycling ratio
   */
  private calculateRecyclingRatio(requests: WasteRequest[]): number {
    if (requests.length === 0) return 0;

    const recyclableRequests = requests.filter(r =>
      r.wasteTypes.some(t => ['plastic', 'paper', 'organic'].includes(t))
    );

    return Math.round((recyclableRequests.length / requests.length) * 100);
  }
}
