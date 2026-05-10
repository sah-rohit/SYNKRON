import sys
import json
import os
import math
import re

def analyze_vulnerabilities(file_path):
    """
    Simulates a PyTorch-driven static analysis system by using sophisticated pattern matching
    and scoring metrics to generate a "Health Vector" (0.0 to 1.0).
    In a full production env, this loads a torchscript model and runs inference over embeddings.
    """
    try:
        if not os.path.exists(file_path):
            return {"error": f"File {file_path} not found", "health_vector": 0.0}

        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Example pattern vectors (would be weights in a PyTorch model)
        patterns = {
            r"eval\(": 0.3,
            r"exec\(": 0.4,
            r"dangerouslySetInnerHTML": 0.2,
            r"os\.system": 0.3,
            r"subprocess\.Popen": 0.15,
            r"SQL注入": 0.5, # Logic placeholder
            r"api_key\s*=\s*['\"][a-zA-Z0-9]+['\"]": 0.4,
            r"password\s*=\s*['\"][a-zA-Z0-9]+['\"]": 0.4,
            r"verify=False": 0.2
        }

        vulnerabilities = []
        cumulative_penalty = 0.0

        for pattern, weight in patterns.items():
            matches = re.findall(pattern, content)
            if matches:
                count = len(matches)
                penalty = weight * (1.0 - math.exp(-count))
                cumulative_penalty += penalty
                vulnerabilities.append({
                    "pattern": pattern,
                    "severity": weight,
                    "occurrences": count
                })

        # Base health 1.0, reduced asymptotically by cumulative penalty
        health = math.exp(-cumulative_penalty)

        # Keep it safe
        health = max(0.0, min(1.0, health))

        return {
            "file_path": file_path,
            "health_vector": round(health, 4),
            "vulnerabilities": vulnerabilities,
            "status": "OK"
        }

    except Exception as e:
        return {"error": str(e), "health_vector": 0.0}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python analyzer.py <file_path>"}))
        sys.exit(1)

    target_path = sys.argv[1]
    result = analyze_vulnerabilities(target_path)
    print(json.dumps(result, indent=2))
