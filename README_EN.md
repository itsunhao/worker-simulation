# 🧱 Worker Life Simulator · City Survival

> Terminal-style text adventure + management game. You arrive in the big city from the countryside with 500 RMB —
> move bricks, deliver food, learn skills, get certificates, date, marry, buy property and cars...
> from having nothing, to surviving in this city.
> Now featuring **🌃 Free Roam Mode**: third-person 3D city exploration, walking freely through neon streets.

![Launcher home](docs/screens/01-home.png)

> Dark terminal-style launcher — start your working career or load a save with one click.

## ✨ Features

| Module | Details |
|---|---|
| 🧑‍💼 Character creation | Name / gender / personality / education / major, 4-stat allocation (STR, INT, CHA, LUCK) |
| 🏗️ Regular jobs | Flyer distribution, moving bricks, food delivery, courier, real estate, club greeter, security, waiter, cashier, retail clerk, etc. |
| 🎓 Adult training | 6 courses: accounting, IT, cooking, electrician, welder, beauty/hairdressing. Master proficiency → pay for exam → get certificate |
| 💼 Professional careers | Junior accountant, programmer, electrician, welder, chef, accounting supervisor — require certificates, salary vastly exceeds regular jobs |
| 🗑️ Recyclables / 🏪 Street vending | Street-survival small income, boosted by LUCK and CHA |
| 🍜 Food system | Street stall, Shaxian, skewers, hotpot, cook your own... restore fullness/stamina/mood |
| 🏠 Housing system | Sleep on street (risky), under bridge, daily rental, hostel, village single room (monthly), apartment |
| 💕 Dating & marriage | Strangers on street / coworkers; chat, treat, gift to build affinity. 30 friends → 50 crush → 60 confess → 90 propose |
| 🛍️ Shopping | Clothes / pants / watch / phone / pet cat — boost CHA and reputation; some jobs have dress code requirements |
| 🏡 Assets | Multiple properties + vehicle models; buying property/cars boosts reputation, unlocks free housing, faster delivery, shop rental income |
| 🏦 Bank savings | Deposit cash for daily interest, fixed-term wealth management available |
| 📈 Stock trading | Real-time quotes at trading hall, buy low sell high for profit |
| 🎫 Entertainment | Scratch cards, double-color ball (daily draw, jackpot 5M RMB), billiards, KTV, park gambling |
| 🌃 Night market / 🕯️ Ghost market | Night street food scene, early-morning antique hunting at ghost market |
| 🌆 Random events | Find wallet, get robbed, rainstorm, hometown friend treats, chengguan chase, overtime... LUCK affects outcomes |
| 🏆 Achievements | First pot of gold, certified professional, car & house, marriage, get rich overnight... |
| ⏱️ Time system | **1 game minute = 1 real second**; pause / 1× / 2× / 4× speed, day-night cycle |
| 💾 Saves | 3 manual slots + daily morning auto-save, JSON format, backup-able |

![Game main interface](docs/screens/02-game-main.png)

> Terminal mode main view: left scene image + terminal window, right character status/relationships/achievements/daily tasks, top quick-action bar.

![City map](docs/screens/03-map.png)

> Bird's-eye city map with 28 locations that change lighting day/night. Click to travel.

## 🌃 Free Roam Mode (3D City Exploration)

Click the **「🌃 Free Roam」** button on the terminal game page to enter a Three.js-powered third-person 3D city and walk through this neon metropolis:

- **🚶 Free movement**: WASD to walk, mouse drag to rotate view, press `E` near a location to enter
- **🗺️ Complete city**: 28 locations mapped 1:1 with terminal mode — job market, mall, bank, car dealership, food street, night market, ghost market, park, KTV, private club...
- **🌗 Day-night sync**: entering free roam auto-aligns to terminal game time; sunrise, sunset, streetlights match perfectly
- **🏙️ High-quality visuals**: AI-generated street textures, skyscrapers, streetlights, trees, vehicles; GPU adaptive quality, auto-degrades on low-end
- **🧭 Mini-map radar**: top-right radar shows nearby locations and your heading — never get lost
- **🚪 One-click return**: when done exploring, switch back to terminal mode to keep working; time and money are fully shared

> Free roam is a "relax and wander" perspective: stroll empty late-night streets, watch the moon by the river, walk from one end of town to the other. When ready to hustle, return to terminal mode and get back to work.

![Free mode 3D night scene](docs/screens/06-free-mode.png)

> 9 PM 3D city: character standing on neon street, operation guide bottom-left, radar mini-map bottom-right, streetlights and moonlight interweave.

## 🛠️ Tech Stack

- **Backend**: Spring Boot 3.3.5 (Java 21+) + Jackson
- **Template**: Thymeleaf
- **Terminal mode**: jQuery 3.7.1 + xterm.js 5.3.0 (terminal rendering) + FitAddon
- **Free roam**: Three.js (WebGL third-person 3D) + AI-generated textures
- **Config**: all game numbers externalized in JSON (`config/game-config.json`), restart to take effect
- **Saves**: written to `saves/` directory at runtime (JSON)

![Lottery station](docs/screens/04-lottery.png)

> Lucky Lottery Station: scratch cards and double-color ball in two tabs, 10 RMB a ticket to try your luck.

## 🚀 How to Run

### Option 1: Run from source (recommended)

```bash
cd worker-simulation
./mvnw spring-boot:run
```

### Option 2: Build & run JAR

```bash
cd worker-simulation
./mvnw -DskipTests package
java -jar target/worker-simulator-1.0.0.jar
```

Then open browser: **http://localhost:8897** (default port)

### Custom config

```bash
java -jar target/worker-simulator-1.0.0.jar \
  --game.start-money=30000 \
  --server.port=9090
```

![Scratch card win](docs/screens/05-scratch.png)

> Red scratch-card style, one click to scratch — higher LUCK means better prizes, top jackpot 5M RMB.

## 🎮 Gameplay Overview

1. **Create character** → choose education (determines stat points), personality, major, allocate 4 stats
2. **Survival start**: go to `Job Market` for a job (`jobs` / `sign <#>`), or `scrap` recyclables on the street
3. **Save route**: work → eat → sleep; once you have tuition, go to `Training Center` for courses and certificates
4. **Breakthrough**: use certificate to enter a professional career, keep saving
5. **Life peak**: shop for clothes to boost CHA → socialize, date, marry → save for property/cars → stocks/lottery for windfall
6. **Relax**: click "Free Roam" to wander the 3D city, watch the moon on late-night streets
7. `save` / `load` anytime, `pause` to pause, `speed 2/4` to fast-forward

### Common Commands

```
help           show all commands    status         view status
move 人才市场  go to location       jobs           job listings
sign 3         get hired (by #)     resign         quit job
work 8         work 8 hours         scrap          collect recyclables
stall          street vending       train 1        study course
exam 1         final exam           eat            eat
sleep          sleep                housing        choose housing
shop / buy 1   mall shopping        assets         view assets
buyhouse 1     buy property         buycar 1       buy car
bank 500       deposit              withdraw 100   withdraw
social         people nearby        talk 1         chat
treat 1        treat to meal        gift 1         give gift
confess 1      confess love        propose 1      propose
scratch 3      scratch cards        lottery buy 5  buy lottery
achievements  achievements          save 1         save game
load 1         load game            pause/resume   pause/resume
speed 4        4x speed
```

![Achievements](docs/screens/13-ach.png)

## 📁 Project Structure

```
worker-simulation/
├── pom.xml                     # Maven config (Spring Boot 3.3.5)
├── config/game-config.json     # ★ External game config (jobs/courses/prices/events/achievements)
├── saves/                      # Runtime saves (JSON)
├── docs/
│   ├── Worker-Simulator-游戏文档.md   # Full game design doc
│   └── screens/                       # Game screenshots
├── src/main/java/com/cityworker/sim/
│   ├── CityWorkerApplication.java
│   ├── controller/             # Page routes + game API
│   ├── service/                # Game engine (time/commands/jobs/training/social/lottery/saves)
│   ├── model/                  # State models & config models
│   └── util/                   # Utilities
└── src/main/resources/
    ├── application.yml         # port / save dir / initial params
    ├── templates/              # index / game / free (3D roam page)
    └── static/                 # css / js (app.js / free.js 3D) / img (AI art) / vendor
```

## ⚙️ Balance Notes

- Time: 1 game minute = 1 real second; one day 1440 min = 24 real minutes
- Start: 500 RMB cash, stamina 100 / fullness 80 / mood 70
- Regular jobs: 8~16 RMB/hour; professional jobs: 20~44 RMB/hour (certificates are the biggest divider)
- Training: tuition 1800~3000 RMB, INT and major affect learning speed, pass rate tied to INT/proficiency
- All numbers adjustable in `config/game-config.json` (restart to take effect)

## 📝 Notes

- Single-player single-session game; state kept in server memory, page refresh won't lose progress (daily auto-save as fallback)
- If you modify external config files, restart the service to apply
- Avatar and scene art are AI-generated, located in `src/main/resources/static/img/`
- Free roam mode (3D) requires a modern browser with WebGL support

## 📄 License

This project is open-sourced under the **MIT License** — free to use, modify, distribute, and commercially use, with attribution required. See [LICENSE](LICENSE) for details.
