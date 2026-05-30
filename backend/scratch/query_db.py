import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration.db")

def main():
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables in DB: {tables}")
    
    # Query synced_screenings
    cursor.execute("SELECT session_id, subject_id, subject_display_name, overall_risk, status, created_at FROM synced_screenings")
    screenings = cursor.fetchall()
    print(f"\nsynced_screenings: ({len(screenings)} records)")
    for s in screenings:
        print(f"Session: {s['session_id']} | SUC: {s['subject_id']} | Name: {s['subject_display_name']} | Risk: {s['overall_risk']} | Status: {s['status']} | Created: {s['created_at']}")
        
    # Query pending_scales
    cursor.execute("SELECT task_id, patient_id, patient_name, session_id, scale_id, status, created_at, submitted_at FROM pending_scales")
    scales = cursor.fetchall()
    print(f"\npending_scales: ({len(scales)} records)")
    for sc in scales:
        print(f"Task: {sc['task_id']} | SUC: {sc['patient_id']} | Name: {sc['patient_name']} | Scale: {sc['scale_id']} | Status: {sc['status']} | Created: {sc['created_at']}")
        
    conn.close()

if __name__ == "__main__":
    main()
