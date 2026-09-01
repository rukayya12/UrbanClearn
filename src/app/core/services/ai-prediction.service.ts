import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Prediction } from '../models/index';
import { User } from '../models/user.model';
import { WasteRequest } from '../models/request.model';

@Injectable({
  providedIn: 'root'
})
export class AiPredictionService {
  private predictionsSubject = new BehaviorSubject<Prediction[]>(this.getPredictionsFromStorage());
  public predictions$ = this.predictionsSubject.asObservable();

  constructor() {}

  /**
   * Generate predictions for a user based on their request history
   * This is a frontend mock service - analyzes local data
   */
  generatePrediction(user: User, requests: WasteRequest[]): Prediction {
    const userRequests = requests.filter(r => r.userId === user.id);

    if (userRequests.length === 0) {
      // No history - return neutral prediction
      return {
        userId: user.id,
        userName: user.fullName,
        riskLevel: 'low',
        predictionScore: 0.2,
        averageRequestInterval: 0,
        missCount: 0,
        lastAnalysisDate: new Date()
      };
    }

    // Calculate metrics from request history
    const completedRequests = userRequests.filter(r => r.status === 'completed').length;
    const rejectedRequests = userRequests.filter(r => r.status === 'rejected').length;
    const pendingRequests = userRequests.filter(r => ['pending', 'received', 'scheduling'].includes(r.status)).length;

    const missCount = rejectedRequests;
    const completionRate = completedRequests / userRequests.length;

    // Calculate average request interval (in days)
    const sortedRequests = [...userRequests].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let averageInterval = 0;

    if (sortedRequests.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < sortedRequests.length; i++) {
        const diff = sortedRequests[i].createdAt.getTime() - sortedRequests[i - 1].createdAt.getTime();
        intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
      }
      averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Determine preferred day and time (mock analysis)
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayFrequency: { [key: string]: number } = {};
    const hourFrequency: { [key: string]: number } = {};

    userRequests.forEach(req => {
      const day = daysOfWeek[new Date(req.requestedTime).getDay()];
      const hour = new Date(req.requestedTime).getHours();

      dayFrequency[day] = (dayFrequency[day] || 0) + 1;
      hourFrequency[`${hour}:00`] = (hourFrequency[`${hour}:00`] || 0) + 1;
    });

    const preferredDay = Object.entries(dayFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';
    const preferredTime = Object.entries(hourFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || '10:00';

    // Calculate risk level and prediction score
    const riskScore = (1 - completionRate) * 0.5 + (missCount / Math.max(userRequests.length, 1)) * 0.3 + (pendingRequests / Math.max(userRequests.length, 1)) * 0.2;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore > 0.6) {
      riskLevel = 'high';
    } else if (riskScore > 0.3) {
      riskLevel = 'medium';
    }

    const prediction: Prediction = {
      userId: user.id,
      userName: user.fullName,
      riskLevel,
      predictionScore: riskScore,
      preferredDay,
      preferredTime,
      averageRequestInterval: Math.round(averageInterval * 10) / 10,
      missCount,
      lastAnalysisDate: new Date()
    };

    // Store prediction
    this.savePrediction(prediction);

    return prediction;
  }

  /**
   * Get prediction for a user
   */
  getUserPrediction(userId: string): Prediction | undefined {
    const predictions = this.getPredictionsFromStorage();
    return predictions.find(p => p.userId === userId);
  }

  /**
   * Get all predictions
   */
  getAllPredictions(): Prediction[] {
    return this.getPredictionsFromStorage();
  }

  /**
   * Get high-risk users
   */
  getHighRiskUsers(): Prediction[] {
    return this.getPredictionsFromStorage()
      .filter(p => p.riskLevel === 'high')
      .sort((a, b) => b.predictionScore - a.predictionScore);
  }

  /**
   * Get medium-risk users
   */
  getMediumRiskUsers(): Prediction[] {
    return this.getPredictionsFromStorage()
      .filter(p => p.riskLevel === 'medium')
      .sort((a, b) => b.predictionScore - a.predictionScore);
  }

  /**
   * Get low-risk users
   */
  getLowRiskUsers(): Prediction[] {
    return this.getPredictionsFromStorage()
      .filter(p => p.riskLevel === 'low')
      .sort((a, b) => a.predictionScore - b.predictionScore);
  }

  /**
   * Save prediction to storage
   */
  private savePrediction(prediction: Prediction): void {
    const predictions = this.getPredictionsFromStorage();
    const index = predictions.findIndex(p => p.userId === prediction.userId);

    if (index === -1) {
      predictions.push(prediction);
    } else {
      predictions[index] = prediction;
    }

    localStorage.setItem('urbanclean_predictions', JSON.stringify(predictions));
    this.predictionsSubject.next(predictions);
  }

  /**
   * Get statistics about predictions
   */
  getPredictionStats(): {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    averageRiskScore: number;
  } {
    const predictions = this.getPredictionsFromStorage();
    const total = predictions.length;
    const highRisk = predictions.filter(p => p.riskLevel === 'high').length;
    const mediumRisk = predictions.filter(p => p.riskLevel === 'medium').length;
    const lowRisk = predictions.filter(p => p.riskLevel === 'low').length;
    const averageRiskScore = total > 0 ? predictions.reduce((sum, p) => sum + p.predictionScore, 0) / total : 0;

    return {
      total,
      highRisk,
      mediumRisk,
      lowRisk,
      averageRiskScore
    };
  }

  private getPredictionsFromStorage(): Prediction[] {
    const stored = localStorage.getItem('urbanclean_predictions');
    if (stored) {
      const data = JSON.parse(stored);
      return data.map((p: any) => ({
        ...p,
        lastAnalysisDate: new Date(p.lastAnalysisDate)
      }));
    }
    return [];
  }
}
