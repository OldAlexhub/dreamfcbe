# Dream Squad FC Backend

Production-structured Node.js backend for Dream Squad FC, a soccer pack-opening and squad-building game.

This API handles:

- user registration and login
- JWT-protected game accounts
- pack listing and pack opening
- owned card collection management
- selling cards back for coins
- 24-hour refill cooldown when a player is stuck
- squad building and auto-build logic
- rich player serialization from the imported `players` collection

This project uses CommonJS, Express, MongoDB, and Mongoose.

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs
- dotenv
- cors

## What This Backend Actually Does

At startup the server:

1. loads environment variables
2. connects to MongoDB
3. seeds default packs if they do not exist yet
4. starts the Express API

At runtime:

- users register and receive starting coins
- users open packs with coins
- the backend pulls players from the `players` collection
- pulled players are stored as `OwnedCard` documents
- users can inspect their club and collection
- users can sell cards for coins
- users can build a squad manually or auto-build one
- if users can no longer afford the cheapest pack, a 24-hour refill cooldown begins

## Important Database Note

This backend uses the exact database selected by `MONGO_URI`.

That matters because your `players` collection must be in the same database the app connects to.

Right now you said you moved the player data into `test`, which is fine. In that setup your connection string should point to `test`, for example:

```env
MONGO_URI=mongodb://127.0.0.1:27017/test
```

or, with Atlas:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/test
```

If your URI does not include a database name, MongoDB commonly falls back to `test`. That is why pack opening only works if `test.players` contains the imported footballer documents.

## Project Structure

```text
server/
  config/
    db.js
  controllers/
    authController.js
    packController.js
    clubController.js
    squadController.js
  middleware/
    authMiddleware.js
    errorMiddleware.js
  models/
    User.js
    Player.js
    OwnedCard.js
    Pack.js
    Squad.js
  routes/
    authRoutes.js
    packRoutes.js
    clubRoutes.js
    squadRoutes.js
  services/
    economyService.js
    packService.js
    squadService.js
  utils/
    buildCollectionInsights.js
    calculateSquadOverall.js
    generateToken.js
    playerData.js
    serializeOwnedCard.js
    serializeSquad.js
    weightedRandom.js
  .env.example
  app.js
  server.js
  package.json
```

## Install and Run

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Copy `.env.example` to `.env` and set real values.

Example:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/test
JWT_SECRET=replace_this_with_a_long_random_secret
STARTING_COINS=1000
REFILL_COINS=500
```

### 3. Start the server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

### 4. Health check

```http
GET /
```

Response:

```json
{
  "success": true,
  "message": "Dream Squad FC backend is running."
}
```

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Express port. Defaults to `5000` if missing. |
| `MONGO_URI` | Yes | MongoDB connection string. Must point to the database containing `players`. |
| `JWT_SECRET` | Yes | Secret used to sign JWTs. |
| `STARTING_COINS` | No | Coins granted to a newly registered user. |
| `REFILL_COINS` | No | Coins granted after cooldown refill. |

## Data Models

### User

Stores account and economy data.

Fields:

- `username`
- `password` (hashed)
- `coins`
- `coinCooldownUntil`
- `packsOpened`
- `wins`
- `losses`

### Player

Maps to the imported `players` collection.

This schema is intentionally flexible because imports can vary. The backend now reads a wide range of player fields and normalizes them through `utils/playerData.js`.

Examples of raw fields the API knows how to use:

- identity: `name`, `short_name`, `full_name`, `long_name`
- profile: `birth_date`, `age`, `height_cm`, `weight_kg`, `weight_kgs`, `body_type`
- team data: `club_name`, `league_name`, `nationality`, `nationality_name`
- positions: `positions`, `player_positions`
- ratings: `overall`, `overall_rating`, `potential`
- market: `value_eur`, `value_euro`, `wage_eur`, `wage_euro`, `release_clause_eur`, `release_clause_euro`
- foot and flair: `preferred_foot`, `weak_foot`, `weak_foot_1_5`, `skill_moves`, `skill_moves_1_5`
- reputation: `international_reputation`, `international_reputation_1_5`
- face stats: `pace`, `shooting`, `passing`, `dribbling`, `defending`, `physic`
- derived stat inputs: `acceleration`, `sprint_speed`, `finishing`, `short_passing`, `long_passing`, `vision`, `ball_control`, `composure`, `interceptions`, `standing_tackle`, `sliding_tackle`, `marking`, `strength`, `stamina`, `jumping`, `aggression`
- goalkeeper data when present: `gk_diving`, `goalkeeping_diving`, `gk_handling`, `goalkeeping_handling`, `gk_kicking`, `goalkeeping_kicking`, `gk_positioning`, `goalkeeping_positioning`, `gk_reflexes`, `goalkeeping_reflexes`

### OwnedCard

Represents a player card owned by a user.

Fields:

- `userId`
- `playerId`
- `acquiredAt`
- `acquiredFromPack`
- `rarity`
- `isFavorite`
- `isInSquad`

### Pack

Represents a pack type available in the shop.

Fields:

- `name`
- `cost`
- `minPlayers`
- `maxPlayers`
- `odds.common`
- `odds.rare`
- `odds.epic`
- `odds.legendary`
- `odds.icon`
- `active`

### Squad

Represents one user's active team.

Fields:

- `userId`
- `formation`
- `startingXI`
- `overall`

## How Player Data Is Used

This backend does not just store player rows and return them raw. It actively uses the imported data to build gameplay.

`utils/playerData.js` normalizes imported player documents into a richer internal shape:

- player name and full name
- age
- nationality
- club
- league
- positions
- primary position
- position group: `GK`, `DEF`, `MID`, `ATT`
- overall and potential
- face stats
- detailed technical stats
- movement stats
- defensive stats
- physical stats
- goalkeeper stats
- market data
- computed `gameScore`

That normalization is then reused by packs, economy, club, and squad systems.

## Pack System

## Default Packs

The server seeds these pack types on startup if they do not already exist:

- Basic Pack
- Silver Pack
- Gold Pack
- Elite Pack

## Rarity Bands

Current rating bands:

- `common`: `0-69`
- `rare`: `70-79`
- `epic`: `80-86`
- `legendary`: `87-91`
- `icon`: `92-99`

## Exact Pack Opening Flow

When `POST /api/packs/open/:packId` is called:

1. the user must be authenticated
2. the pack must exist and be active
3. the `players` collection must contain data
4. the user must have enough coins
5. the number of pulled players is randomly chosen between `minPlayers` and `maxPlayers`
6. for each pull, rarity is selected using weighted randomness
7. the backend queries players in the chosen rating band
8. inside that band, it samples candidates and then prefers stronger players using:
   - overall
   - international reputation
   - market value
9. duplicate players inside the same pack are avoided
10. pulled players become `OwnedCard` documents
11. coins are deducted
12. `packsOpened` increments
13. cooldown status is recalculated
14. the response includes:
   - updated coins
   - pulled cards
   - pull summary
   - collection-style player insights

## Weighted Randomness

The pack system uses `utils/weightedRandom.js`.

Example:

```js
{
  common: 72,
  rare: 22,
  epic: 5,
  legendary: 1,
  icon: 0.1
}
```

This does not guarantee exact results in a single pack. It defines probability weights across many openings.

## Economy System

## Selling Cards

Users can sell one card or multiple cards with `POST /api/club/sell`.

A card cannot be sold if:

- it does not belong to the current user
- it is currently in the squad

Sell value is not flat. It uses rich player data:

- overall
- potential
- international reputation
- skill moves
- weak foot
- market value
- rarity multiplier

Current rarity multipliers:

- `common`: `1`
- `rare`: `1.2`
- `epic`: `1.55`
- `legendary`: `2.1`
- `icon`: `3`

## Cooldown and Coin Refill

The backend always checks the cheapest active pack.

If the user's coins drop below that cost:

- the user is considered stuck
- if `coinCooldownUntil` is empty, it is set to `now + 24 hours`

If the user can afford a pack again:

- cooldown is cleared

The refill flow:

1. user must be stuck
2. cooldown must exist
3. cooldown must be expired
4. `REFILL_COINS` is added
5. cooldown is cleared
6. cooldown state is recalculated again

This keeps the game playable without real-money purchases.

## Club and Collection System

`GET /api/club` returns:

- user summary
- coins
- wins and losses
- cooldown state
- collection summary

`GET /api/club/collection` returns:

- all owned cards
- populated player data
- computed sell values
- collection insights

Current collection insights include:

- total card count
- squad count
- favorite count
- average overall
- average potential
- average age
- rarity breakdown
- position breakdown
- position-group breakdown
- top nationalities
- top clubs
- top leagues
- chemistry score

## Squad System

## Manual Squad Update

`PUT /api/squad` allows:

- changing formation
- replacing `startingXI`

Validation rules:

- max 11 cards
- no duplicates
- all cards must belong to the user

The backend also syncs `isInSquad` on `OwnedCard`.

## Squad Overall

Squad overall is the rounded average of the selected players' normalized overall values.

The API uses normalized player overall, which means it can still work if the import uses `overall_rating` instead of `overall`.

## Auto-Build Logic

`POST /api/squad/auto-build` is not just a "top 11 by overall" sort anymore.

It works like this:

1. read the current squad formation
2. convert the formation into role slots
   - example `4-3-3` becomes:
     - `1 GK`
     - `4 DEF`
     - `3 MID`
     - `3 ATT`
3. score every owned card against each role
4. score uses:
   - normalized `gameScore`
   - role-specific strength
   - position-fit bonus
   - versatility bonus
5. pick the best remaining card for each role slot
6. fill any remaining spots with the strongest unused cards
7. save squad and sync `isInSquad`

This makes positions matter instead of ignoring them.

## Chemistry

Collection and squad summaries include a chemistry score.

Current chemistry scoring looks at pair links for:

- same club
- same nationality
- same league

This chemistry value is currently returned as data for clients and future gameplay systems. It is not yet modifying match results because there is no match engine in this backend yet.

## Authentication

Auth uses JWT bearer tokens.

Flow:

1. `POST /api/auth/register`
2. receive token
3. send `Authorization: Bearer <token>` for protected routes

Passwords are hashed with `bcryptjs`.

Protected routes:

- `/api/auth/me`
- `/api/packs/open/:packId`
- all `/api/club/*`
- all `/api/squad/*`

## API Routes

### Auth

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register user and return token |
| `POST` | `/api/auth/login` | Login and return token |
| `GET` | `/api/auth/me` | Return current user |

### Packs

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/packs` | List active packs |
| `POST` | `/api/packs/open/:packId` | Open a pack |

### Club

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/club` | Club summary |
| `GET` | `/api/club/collection` | All owned cards |
| `POST` | `/api/club/sell` | Sell one or many owned cards |
| `POST` | `/api/club/claim-refill` | Claim refill after cooldown |

### Squad

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/squad` | Get current squad |
| `PUT` | `/api/squad` | Update formation and/or starting XI |
| `POST` | `/api/squad/auto-build` | Auto-build best squad |

## Example Requests

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "kidmanager",
  "password": "secret123"
}
```

### Open a Pack

```http
POST /api/packs/open/64f000000000000000000001
Authorization: Bearer <token>
```

### Sell Cards

```http
POST /api/club/sell
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "ownedCardIds": [
    "64f000000000000000000111",
    "64f000000000000000000222"
  ]
}
```

### Update Squad

```http
PUT /api/squad
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "formation": "4-3-3",
  "startingXI": [
    "64f000000000000000000111",
    "64f000000000000000000112",
    "64f000000000000000000113"
  ]
}
```

## Response Style

The API returns JSON responses with a predictable top-level structure:

- `success`
- data payload
- `message` when useful

Error responses are also JSON:

```json
{
  "success": false,
  "message": "Not enough coins to open Basic Pack.",
  "details": {
    "currentCoins": 100,
    "packCost": 200
  }
}
```

## Error Handling

The backend includes:

- route-not-found middleware
- centralized error middleware
- auth middleware for JWT verification
- validation errors for bad input
- duplicate-key handling for unique usernames
- ObjectId cast handling

## Notes About Imported Player Data

The current code assumes imported footballer documents may be messy or inconsistent, so it supports aliases.

Examples:

- `overall` or `overall_rating`
- `positions` or `player_positions`
- `nationality` or `nationality_name`
- `value_eur` or `value_euro`
- `wage_eur` or `wage_euro`
- `weak_foot` or `weak_foot_1_5`
- `skill_moves` or `skill_moves_1_5`
- `international_reputation` or `international_reputation_1_5`

That means your `players` import does not have to match one perfect schema to be useful.

## Troubleshooting

### Pack opening says `Players collection is empty`

Cause:

- `MONGO_URI` points to the wrong database

Fix:

- make sure the URI includes the database that actually contains `players`
- in your current setup, that is `test`

### Pack opening says no eligible players were found

Cause:

- documents do not contain usable `overall` or `overall_rating` values

Fix:

- verify imported player rows have rating data

### Auth routes fail with invalid token

Cause:

- missing or malformed bearer token

Fix:

- send `Authorization: Bearer <token>`

### Cooldown is not starting

Cause:

- the user can still afford the cheapest active pack

Fix:

- check the cheapest pack cost in `/api/packs`
- check user coins in `/api/club`

## Extension Ideas

Good next backend features:

- match simulation using squad chemistry and role balance
- favorites endpoint
- card search and filtering by nation, club, league, position, rarity
- duplicate protection rules
- special promo packs
- manager cards or chemistry styles
- achievements and daily missions
- transfer market between users

## Summary

This backend is not just a CRUD wrapper over MongoDB.

It already uses imported footballer data to drive:

- card identity
- ratings
- market economy
- sell prices
- rarity pulls
- collection summaries
- chemistry summaries
- formation-aware squad selection

As long as `MONGO_URI` points to the database containing your `players` collection, the backend will use that data directly.
