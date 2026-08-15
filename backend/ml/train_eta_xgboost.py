"""
SmartBus — XGBoost Transit ETA Regression Pipeline
Trains a gradient boosted decision tree model (XGBRegressor) to predict bus transit time to assigned stops.
"""

import json
import os
import sys
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

FEATURE_NAMES = [
    "remaining_distance_meters",
    "current_speed_kmh",
    "effective_speed_kmh",
    "historical_avg_segment_time_sec",
    "day_of_week",
    "hour_of_day",
    "minute_of_hour",
    "is_peak_hour",
    "is_weekend",
    "stops_remaining",
    "progress_ratio",
    "traffic_congestion_factor",
]

def generate_synthetic_transit_dataset(n_samples: int = 15000, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)

    # 1. Road distance (100m to 25km)
    distances = np.random.uniform(100, 25000, n_samples)

    # 2. Time parameters
    days = np.random.randint(0, 7, n_samples)  # 0=Sun, 1=Mon, ..., 6=Sat
    hours = np.random.randint(6, 21, n_samples)  # College bus operational hours 6 AM - 8 PM
    minutes = np.random.randint(0, 60, n_samples)

    is_peak = np.array([
        1 if (7 <= h <= 9 or 15 <= h <= 18) and d in [1, 2, 3, 4, 5] else 0
        for h, d in zip(hours, days)
    ])
    is_weekend = np.array([1 if d in [0, 6] else 0 for d in days])

    # 3. Stops remaining (0 to 12)
    stops_remaining = np.clip((distances / 2000) + np.random.normal(0, 1, n_samples), 0, 15).astype(int)

    # 4. Progress ratio (0.0 to 1.0)
    progress_ratio = np.random.uniform(0.05, 0.95, n_samples)

    # 5. Speeds
    # Base free-flow speed around 30-45 km/h
    free_flow_speed = np.random.normal(36, 5, n_samples)

    # Traffic congestion factor (0.35 = heavy traffic, 1.0 = clear road)
    traffic_factor = np.ones(n_samples)
    for i in range(n_samples):
        if is_peak[i] == 1:
            traffic_factor[i] = np.random.uniform(0.40, 0.70)
        elif is_weekend[i] == 1:
            traffic_factor[i] = np.random.uniform(0.85, 1.05)
        else:
            traffic_factor[i] = np.random.uniform(0.70, 0.95)

    effective_speed = np.clip(free_flow_speed * traffic_factor, 10, 55)

    # Current instantaneous speed with occasional stops at traffic signals / bus stops (12% chance of speed 0-5)
    current_speed = np.copy(effective_speed)
    stopped_mask = np.random.random(n_samples) < 0.14
    current_speed[stopped_mask] = np.random.uniform(0, 4, np.sum(stopped_mask))
    current_speed = np.clip(current_speed, 0, 60)

    # 6. Historical segment baseline time
    # Average time based on standard segment transit
    historical_avg_time = (distances / 1000.0) / 28.0 * 3600.0  # at 28 km/h baseline
    historical_avg_time += stops_remaining * 40.0  # 40s dwell per stop

    # 7. Ground truth transit duration in seconds (Target)
    # Travel time = (Distance / speed) + stop dwell times + signal variance + traffic impedance
    driving_time_sec = (distances / (effective_speed * (1000.0 / 3600.0)))
    dwell_time_sec = stops_remaining * np.random.uniform(30, 55, n_samples)
    traffic_delay_sec = (1.0 - traffic_factor) * (distances / 1000.0) * 45.0
    noise_sec = np.random.normal(0, 15, n_samples)

    target_travel_time_sec = np.clip(
        driving_time_sec + dwell_time_sec + traffic_delay_sec + noise_sec,
        15,
        10800  # Max 3 hours
    )

    df = pd.DataFrame({
        "remaining_distance_meters": distances,
        "current_speed_kmh": current_speed,
        "effective_speed_kmh": effective_speed,
        "historical_avg_segment_time_sec": historical_avg_time,
        "day_of_week": days,
        "hour_of_day": hours,
        "minute_of_hour": minutes,
        "is_peak_hour": is_peak,
        "is_weekend": is_weekend,
        "stops_remaining": stops_remaining,
        "progress_ratio": progress_ratio,
        "traffic_congestion_factor": traffic_factor,
        "target_travel_time_seconds": target_travel_time_sec,
    })

    return df

def train_and_export_xgboost_pipeline():
    print("[*] SmartBus XGBoost Pipeline: Generating transit dataset...")
    df = generate_synthetic_transit_dataset(n_samples=16000)

    X = df[FEATURE_NAMES]
    y = df["target_travel_time_seconds"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"[*] Training XGBoost Regressor on {len(X_train)} samples across {len(FEATURE_NAMES)} features...")

    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        random_state=42,
        tree_method="hist",
    )

    model.fit(X_train, y_train)

    # Evaluation
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print("\n==================================================")
    print("MODEL EVALUATION RESULTS")
    print("==================================================")
    print(f"[OK] R2 Score: {r2:.4f} ({r2 * 100:.2f}% variance explained)")
    print(f"[OK] Mean Absolute Error (MAE): {mae:.2f} seconds ({mae / 60.0:.2f} minutes)")
    print("==================================================\n")

    # Feature Importances
    importances = model.feature_importances_
    feat_imp = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    print("Top Feature Importances:")
    for feat, imp in feat_imp:
        print(f" - {feat:32s}: {imp * 100:.2f}%")

    # Export Model Artifacts
    output_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(output_dir, exist_ok=True)

    json_model_path = os.path.join(output_dir, "eta_xgboost_model.json")
    model.save_model(json_model_path)
    print(f"\n[+] Saved XGBoost model JSON to: {json_model_path}")

    # Metadata & Scalers
    meta_path = os.path.join(output_dir, "eta_model_metadata.json")
    metadata = {
        "model_type": "XGBRegressor",
        "version": "1.0.0",
        "feature_names": FEATURE_NAMES,
        "n_estimators": 100,
        "max_depth": 5,
        "learning_rate": 0.08,
        "metrics": {
            "r2_score": float(r2),
            "mae_seconds": float(mae),
            "mae_minutes": float(mae / 60.0),
        },
        "feature_importances": {feat: float(imp) for feat, imp in feat_imp},
        "default_free_flow_speed_kmh": 32.0,
        "min_reasonable_speed_kmh": 12.0,
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Saved model metadata to: {meta_path}\n")

if __name__ == "__main__":
    train_and_export_xgboost_pipeline()
