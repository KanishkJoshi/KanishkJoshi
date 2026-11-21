#!/usr/bin/env python3
"""Assemble app.js from src/*.js (in file-name order). Run after editing anything in src/:
    python3 tools/build.py
The parts share one IIFE: 01-constants.js opens it and the last part closes it."""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
parts = sorted((root / 'src').glob('*.js'))
text = ''.join(p.read_text(encoding='utf-8').rstrip() + '\n\n' for p in parts).rstrip() + '\n'
(root / 'app.js').write_text(text, encoding='utf-8')
print(f'app.js: {len(parts)} parts, {len(text.splitlines())} lines, {len(text.encode())} bytes')
