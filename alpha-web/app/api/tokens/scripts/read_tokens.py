#!/usr/bin/env python3
"""
read_tokens.py
----------------
Utility to load token data from pickle, JSON, or CSV files.
Used by the overlap tracker API to provide token metadata.

Features:
- Supports .pkl, .json, and .csv
- Normalizes token data into a consistent list of dicts
- Easy to extend for other sources

Example:
    python read_tokens.py --file ./data/tokens.pkl
"""

import argparse
import json
import os
import pickle
import csv
from typing import List, Dict, Any


def load_tokens(file_path: str) -> List[Dict[str, Any]]:
    """
    Load token data from a file and return a list of dicts.

    Args:
        file_path (str): Path to the tokens file.

    Returns:
        List[Dict[str, Any]]: Token data as a list of dictionaries.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Token file not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pkl":
        with open(file_path, "rb") as f:
            data = pickle.load(f)
    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif ext == ".csv":
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            data = [row for row in reader]
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Normalize: make sure everything is a list of dicts
    if isinstance(data, dict):
        # If dict with token symbol as key, convert
        normalized = [{"symbol": k, **v} if isinstance(v, dict) else {"symbol": k, "data": v} for k, v in data.items()]
    elif isinstance(data, list):
        normalized = data
    else:
        raise ValueError("Unsupported data format in token file")

    return normalized


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read and print token data")
    parser.add_argument("--file", required=True, help="Path to token data file (pkl/json/csv)")
    args = parser.parse_args()

    tokens = load_tokens(args.file)
    print(json.dumps(tokens, indent=2))
