#!/bin/bash

# Script to clean cache and output folders
# Usage: ./scripts/clean.sh or npm run clean

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check if we're in the project root
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "Error: This script must be run from the project root directory."
  echo "Please run as: ./scripts/clean.sh"
  exit 1
fi

echo "Cleaning cache and output folders..."

# Remove cache directory
if [ -d "$PROJECT_ROOT/cache" ]; then
  echo "Removing cache directory..."
  rm -rf "$PROJECT_ROOT/cache"
fi

# Remove output directory
if [ -d "$PROJECT_ROOT/output" ]; then
  echo "Removing output directory..."
  rm -rf "$PROJECT_ROOT/output"
fi

# Remove dist directory
if [ -d "$PROJECT_ROOT/dist" ]; then
  echo "Removing dist directory..."
  rm -rf "$PROJECT_ROOT/dist"
fi

echo "Clean completed successfully!"
