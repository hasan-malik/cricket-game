# Arcade Cricket Browser Game

A browser-based arcade cricket batting game with a time-based shot system.

## How to play

Time your shot using the timing meter on the right. Each delivery has a preferred side — watch for the hint above the pitch. Hit on the correct side with good timing to score big.

### Controls

| Input | Action |
|-------|--------|
| Left arrow | Leg side shot |
| Right arrow | Off side shot |
| Space | Pause / resume |
| P | Toggle practice mode |

You can also tap the **LEG SIDE** / **OFF SIDE** buttons on mobile, click the **Pause** button in the header, or click the **game logo** to pause.

## Scoring

| Timing | Runs |
|--------|------|
| Perfect | 6 |
| Slight early / slight late | 4 |
| Early / late | 2 |
| Very mistimed | 1 |
| Wrong side (ball hitting stumps) | Wicket |
| Wrong side (ball missing stumps) | 1 run (nicked) |

## Delivery types

| Type | Ideal timing | Preferred side |
|------|-------------|----------------|
| Inswinger | 1.03s | Leg |
| Outswinger | 1.05s | Off |
| Yorker | 0.93s | Leg |
| Bouncer | 1.14s | Off |

## Timing meter

The vertical meter on the right shows where your shot landed:
- **EARLY** (red) — too soon
- **SLIGHT EARLY** (orange) — a touch early
- **PERFECT** (yellow) — ideal timing
- **SLIGHT LATE** (orange) — a touch late
- **LATE** (red) — too slow

In practice mode, a live blue marker tracks the current timing window as the ball travels.

## HUD

- **Score** — runs / wickets, with current overs (e.g. `47/1   2.3 (5.0)`)
- **Target** — randomly generated target (80–120) for each innings
- **Current Over** — ball-by-ball results for the ongoing over (· = dot, W = wicket)

## Game settings

- 30 balls per innings (5 overs)
- 3 wickets maximum
