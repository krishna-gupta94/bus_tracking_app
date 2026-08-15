import fs from 'fs';
import path from 'path';

export interface XGBoostTransitFeatures {
  remainingDistanceMeters: number;
  currentSpeedKmh: number;
  effectiveSpeedKmh: number;
  historicalAvgSegmentTimeSec: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  hourOfDay: number; // 0-23
  minuteOfHour: number; // 0-59
  isPeakHour: number; // 0 or 1
  isWeekend: number; // 0 or 1
  stopsRemaining: number;
  progressRatio: number; // 0.0 - 1.0
  trafficCongestionFactor: number; // 0.3 - 1.2
}

interface XGBoostTree {
  left_children: number[];
  right_children: number[];
  split_indices: number[];
  split_conditions: number[];
  base_weights: number[];
}

interface XGBoostModelJSON {
  learner?: {
    gradient_booster?: {
      model?: {
        trees?: XGBoostTree[];
        gbtree_model_param?: {
          num_trees?: string;
        };
      };
    };
  };
}

class XGBoostEngine {
  private trees: XGBoostTree[] = [];
  private isLoaded = false;
  private baseScore = 0.5;

  constructor() {
    this.loadModel();
  }

  private loadModel(): void {
    try {
      const modelPath = path.resolve(__dirname, '../../ml/models/eta_xgboost_model.json');
      if (fs.existsSync(modelPath)) {
        const raw = fs.readFileSync(modelPath, 'utf-8');
        const json: XGBoostModelJSON = JSON.parse(raw);
        this.trees = json.learner?.gradient_booster?.model?.trees || [];
        this.isLoaded = this.trees.length > 0;
        console.log(`[XGBoostEngine] Successfully loaded ${this.trees.length} decision trees for ETA inference.`);
      } else {
        console.warn(`[XGBoostEngine] Model file not found at ${modelPath}. Will use robust mathematical fallback.`);
      }
    } catch (err) {
      console.error('[XGBoostEngine] Failed to load model JSON:', err);
      this.isLoaded = false;
    }
  }

  /**
   * Convert feature object to tabular array matching FEATURE_NAMES order:
   * 0: remaining_distance_meters
   * 1: current_speed_kmh
   * 2: effective_speed_kmh
   * 3: historical_avg_segment_time_sec
   * 4: day_of_week
   * 5: hour_of_day
   * 6: minute_of_hour
   * 7: is_peak_hour
   * 8: is_weekend
   * 9: stops_remaining
   * 10: progress_ratio
   * 11: traffic_congestion_factor
   */
  public vectorize(f: XGBoostTransitFeatures): number[] {
    return [
      Math.max(0, f.remainingDistanceMeters),
      Math.max(0, f.currentSpeedKmh),
      Math.max(5, f.effectiveSpeedKmh),
      Math.max(0, f.historicalAvgSegmentTimeSec),
      Math.max(0, Math.min(6, f.dayOfWeek)),
      Math.max(0, Math.min(23, f.hourOfDay)),
      Math.max(0, Math.min(59, f.minuteOfHour)),
      f.isPeakHour ? 1 : 0,
      f.isWeekend ? 1 : 0,
      Math.max(0, f.stopsRemaining),
      Math.max(0, Math.min(1, f.progressRatio)),
      Math.max(0.2, Math.min(1.5, f.trafficCongestionFactor)),
    ];
  }

  /**
   * Evaluates a single decision tree in the ensemble
   */
  private evaluateTree(tree: XGBoostTree, features: number[]): number {
    let nodeIdx = 0;
    while (true) {
      const leftChild = tree.left_children[nodeIdx];
      const rightChild = tree.right_children[nodeIdx];

      // Leaf node check
      if (leftChild === -1 && rightChild === -1) {
        return tree.split_conditions[nodeIdx];
      }

      const featureIdx = tree.split_indices[nodeIdx];
      const threshold = tree.split_conditions[nodeIdx];
      const val = features[featureIdx] ?? 0;

      if (val < threshold) {
        nodeIdx = leftChild;
      } else {
        nodeIdx = rightChild;
      }

      if (nodeIdx === -1 || nodeIdx >= tree.split_conditions.length) {
        return tree.base_weights[nodeIdx] ?? 0;
      }
    }
  }

  /**
   * Predicts transit duration in seconds from the trained XGBoost ensemble
   */
  public predictSeconds(features: XGBoostTransitFeatures): number {
    if (!this.isLoaded || this.trees.length === 0) {
      // Fallback: Physics + historical blend
      const speedMs = (Math.max(12, features.effectiveSpeedKmh) * 1000) / 3600;
      const baseSec = features.remainingDistanceMeters / speedMs;
      const dwellSec = features.stopsRemaining * 35;
      return Math.round(baseSec + dwellSec);
    }

    const featureVector = this.vectorize(features);
    let totalScore = 0;

    for (let i = 0; i < this.trees.length; i++) {
      totalScore += this.evaluateTree(this.trees[i], featureVector);
    }

    // Ensure non-negative, realistic prediction bounds (minimum 10s if distance > 0)
    if (features.remainingDistanceMeters <= 50) return 0;
    const predictedSec = Math.max(15, Math.round(totalScore));
    return predictedSec;
  }
}

export const xgboostEngine = new XGBoostEngine();
