"""
Tracking Service — wraps Football-Analysis-System for video analysis.

Pipeline: Video → YOLO Detection → Team Assignment → Camera Movement
         → Speed/Distance → Structured JSON + annotated video
"""
import sys
import os
import json
import tempfile
import uuid
from pathlib import Path
from typing import Any

# Add Football-Analysis-System to Python path
FOOTBALL_ANALYSIS_DIR = Path(__file__).resolve().parents[4] / "Football-Analysis-System-main"
if str(FOOTBALL_ANALYSIS_DIR) not in sys.path:
    sys.path.insert(0, str(FOOTBALL_ANALYSIS_DIR))


def run_tracking(video_path: str, output_dir: str | None = None) -> dict[str, Any]:
    """
    Run the full Football-Analysis-System tracking pipeline on a video.

    Args:
        video_path: Path to the input match video clip
        output_dir: Directory to save output video (defaults to temp dir)

    Returns:
        Dictionary with all tracking data:
        - team_ball_control: {team_1_pct, team_2_pct}
        - player_stats: [{id, team, avg_speed_kmh, total_distance_m}]
        - total_frames: int
        - output_video_path: str
        - team_colors: {team_1: [r,g,b], team_2: [r,g,b]}
    """
    import cv2
    import numpy as np

    # Lazy imports from Football-Analysis-System
    from utils import read_video, save_video
    from trackers import Tracker
    from team_assigner import TeamAssigner
    from player_ball_assigner import PlayerBallAssigner
    from camera_movement_estimator import CameraMovementEstimator
    from view_transformer import ViewTransformer
    from speed_and_distance_estimator import SpeedAndDistanceEstimator

    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="lumen_analysis_")

    output_video_path = os.path.join(output_dir, f"tracked_{uuid.uuid4().hex[:8]}.avi")

    # 1. Read video
    video_frames = read_video(video_path)
    total_frames = len(video_frames)

    # 2. Initialize tracker with YOLO model
    model_path = str(FOOTBALL_ANALYSIS_DIR / "models" / "best.pt")
    tracker = Tracker(model_path)

    # 3. Get object tracks (players, referees, ball)
    tracks = tracker.get_object_tracks(video_frames, read_from_stub=False)
    tracker.add_position_to_tracks(tracks)

    # 4. Camera movement estimation
    camera_movement_estimator = CameraMovementEstimator(video_frames[0])
    camera_movement_per_frame = camera_movement_estimator.get_camera_movement(
        video_frames, read_from_stub=False
    )
    camera_movement_estimator.add_adjust_positions_to_tracks(tracks, camera_movement_per_frame)

    # 5. View transformer (pixel → real-world coordinates)
    view_transformer = ViewTransformer()
    view_transformer.add_transformed_position_to_tracks(tracks)

    # 6. Interpolate ball positions
    tracks["ball"] = tracker.interpolate_ball_positions(tracks["ball"])

    # 7. Speed and distance estimation
    speed_and_distance_estimator = SpeedAndDistanceEstimator()
    speed_and_distance_estimator.add_speed_and_sistance_to_tracks(tracks)

    # 8. Team assignment (K-means on jersey colors)
    team_assigner = TeamAssigner()
    team_assigner.assign_team_color(video_frames[0], tracks["players"][0])

    for frame_num, player_tracks in enumerate(tracks["players"]):
        for player_id, track in player_tracks.items():
            team = team_assigner.get_player_team(
                video_frames[frame_num], track["bbox"], player_id
            )
            tracks["players"][frame_num][player_id]["team"] = team
            tracks["players"][frame_num][player_id]["team_color"] = team_assigner.team_color[team]

    # 9. Ball possession tracking
    player_assigner = PlayerBallAssigner()
    team_ball_control = []
    for frame_num, player_track in enumerate(tracks["players"]):
        ball_bbox = tracks["ball"][frame_num][1]["bbox"]
        assigned_player = player_assigner.assign_ball_to_player(player_track, ball_bbox)

        if assigned_player != -1:
            tracks["players"][frame_num][assigned_player]["has_ball"] = True
            team_ball_control.append(tracks["players"][frame_num][assigned_player]["team"])
        else:
            team_ball_control.append(team_ball_control[-1] if team_ball_control else 1)

    team_ball_control_arr = np.array(team_ball_control)

    # 10. Calculate ball control percentages
    team_1_frames = int((team_ball_control_arr == 1).sum())
    team_2_frames = int((team_ball_control_arr == 2).sum())
    total_control = team_1_frames + team_2_frames
    team_1_pct = round(team_1_frames / total_control * 100, 1) if total_control > 0 else 50.0
    team_2_pct = round(team_2_frames / total_control * 100, 1) if total_control > 0 else 50.0

    # 11. Extract player stats (speed and distance)
    player_stats = []
    player_data: dict[int, dict] = {}

    for frame_num, player_tracks in enumerate(tracks["players"]):
        for player_id, track in player_tracks.items():
            if player_id not in player_data:
                player_data[player_id] = {
                    "id": int(player_id),
                    "team": int(track.get("team", 0)),
                    "speeds": [],
                    "distance": 0.0,
                }
            speed = track.get("speed", 0)
            distance = track.get("distance", 0)
            if speed:
                player_data[player_id]["speeds"].append(float(speed))
            if distance:
                player_data[player_id]["distance"] = float(distance)

    for pid, data in player_data.items():
        avg_speed = round(sum(data["speeds"]) / len(data["speeds"]), 1) if data["speeds"] else 0.0
        player_stats.append({
            "id": data["id"],
            "team": data["team"],
            "avg_speed_kmh": avg_speed,
            "total_distance_m": round(data["distance"], 1),
        })

    # Sort by team then id
    player_stats.sort(key=lambda x: (x["team"], x["id"]))

    # 12. Team colors
    team_colors = {}
    for team_id, color in team_assigner.team_color.items():
        team_colors[f"team_{team_id}"] = [int(c) for c in color]

    # 13. Draw annotated output video
    output_video_frames = tracker.draw_annotations(video_frames, tracks, team_ball_control_arr)
    output_video_frames = camera_movement_estimator.draw_camera_movement(
        output_video_frames, camera_movement_per_frame
    )
    speed_and_distance_estimator.draw_speed_and_distance(output_video_frames, tracks)
    save_video(output_video_frames, output_video_path)

    return {
        "team_ball_control": {
            "team_1_pct": team_1_pct,
            "team_2_pct": team_2_pct,
        },
        "player_stats": player_stats,
        "total_frames": total_frames,
        "output_video_path": output_video_path,
        "team_colors": team_colors,
        "player_count": len(player_stats),
    }
