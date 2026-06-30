# Mistakes till Now

This file documents critical mistakes and lessons learned to prevent regressions.

## 1. Initial State Handling
- Make sure to cover edge cases like 10-minute hold timers in booking and auto-expiry.
- Ensure state transitions are strictly verified against the database before returning success.
