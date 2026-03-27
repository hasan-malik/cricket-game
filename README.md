# Arcade Cricket Browser Game v4

This version changes the timing model to the one you requested.

## New timing model
Each delivery has:
- a preferred side
- an ideal hit time in seconds after release
- a scoring window
- a wicket window

Current values:
- Inswinger: ideal 1.03s, preferred side leg
- Outswinger: ideal 1.05s, preferred side off
- Yorker: ideal 0.93s, preferred side leg
- Bouncer: ideal 1.14s, preferred side off

## Timing bar
- top = 0 = very early
- middle = 100 = perfect
- bottom = 0 = very late

The marker shows where your shot landed relative to perfect timing.

## Wrong side
Wrong side now gives an immediate bad result:
- if ball was hitting stumps: wicket
- otherwise: dot ball
