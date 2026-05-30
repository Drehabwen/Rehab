import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration.db")

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Query synced_screenings for SUC "TEST"
    cursor.execute("SELECT session_id, payload, created_at FROM synced_screenings WHERE subject_id = 'TEST' ORDER BY datetime(created_at) ASC")
    rows = cursor.fetchall()
    print(f"=== Screening Payloads for TEST ({len(rows)} records) ===")
    for row in rows:
        payload = json.loads(row["payload"])
        print(f"\nSession: {row['session_id']} | Date: {row['created_at']}")
        print(f"Subject Display Name: {payload['subject']['display_name']}")
        print("Protocol Results:")
        for res in payload.get('protocol_results', []):
            print(f"  Protocol: {res['protocol']} | Quality: {res['capture_quality']}")
            print(f"  Metrics: {json.dumps(res.get('metrics', {}), ensure_ascii=False)}")
            print(f"  Findings: {res.get('findings', [])}")
            print(f"  Risk Flags: {res.get('risk_flags', [])}")
            
    # Query pending_scales for TEST
    cursor.execute("SELECT task_id, scale_id, payload, submitted_at FROM pending_scales WHERE patient_id = 'TEST' AND status = 'completed'")
    scales = cursor.fetchall()
    print(f"\n=== Completed Scales for TEST ({len(scales)} records) ===")
    for sc in scales:
        print(f"\nTask: {sc['task_id']} | Scale: {sc['scale_id']} | Submitted: {sc['submitted_at']}")
        try:
            scale_data = json.loads(sc["payload"])
            print(f"Scale Data: {json.dumps(scale_data, ensure_ascii=False, indent=2)}")
        except Exception as e:
            print(f"Failed to parse scale payload: {e}")
            
    conn.close()

if __name__ == "__main__":
    main()
