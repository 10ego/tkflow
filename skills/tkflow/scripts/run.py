#!/usr/bin/env python3
"""Run the packaged tkflow helper without a separate PATH installation."""
from pathlib import Path
import runpy
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
runpy.run_path(str(root / "tkflow.py"), run_name="__main__")
