const mongoose = require("mongoose");

// This schema stays flexible so it can map to the imported FIFA-style player data.
const playerSchema = new mongoose.Schema(
  {
    short_name: {
      type: String,
      default: ""
    },
    full_name: {
      type: String,
      default: ""
    },
    long_name: {
      type: String,
      default: ""
    },
    name: {
      type: String,
      default: ""
    },
    rarity: {
      type: String,
      default: ""
    },
    rarity_tier: {
      type: String,
      default: ""
    },
    cardDesign: {
      type: String,
      default: ""
    },
    card_design: {
      type: String,
      default: ""
    },
    specialEdition: {
      type: String,
      default: ""
    },
    special_edition: {
      type: String,
      default: ""
    },
    cardSeries: {
      type: String,
      default: ""
    },
    card_series: {
      type: String,
      default: ""
    },
    isIcon: {
      type: Boolean,
      default: false
    },
    is_icon: {
      type: Boolean,
      default: false
    },
    isDreamIcon: {
      type: Boolean,
      default: false
    },
    birth_date: {
      type: String,
      default: ""
    },
    age: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    height_cm: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    weight_kg: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    weight_kgs: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    preferred_foot: {
      type: String,
      default: ""
    },
    weak_foot: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    weak_foot_1_5: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    skill_moves: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    skill_moves_1_5: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    international_reputation: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    international_reputation_1_5: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    body_type: {
      type: String,
      default: ""
    },
    club_name: {
      type: String,
      default: ""
    },
    league_name: {
      type: String,
      default: ""
    },
    nationality_name: {
      type: String,
      default: ""
    },
    nationality: {
      type: String,
      default: ""
    },
    player_positions: {
      type: mongoose.Schema.Types.Mixed,
      default: ""
    },
    positions: {
      type: mongoose.Schema.Types.Mixed,
      default: ""
    },
    overall: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    overall_rating: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    potential: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    value_eur: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    value_euro: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    wage_eur: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    wage_euro: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    release_clause_eur: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    release_clause_euro: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    pace: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    shooting: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    passing: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    dribbling: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    defending: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    physic: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    acceleration: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    sprint_speed: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    finishing: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    shot_power: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    long_shots: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    volleys: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    penalties: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    short_passing: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    long_passing: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    vision: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    crossing: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    curve: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    freekick_accuracy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ball_control: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    agility: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    balance: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    reactions: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    composure: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    interceptions: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    standing_tackle: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    sliding_tackle: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    marking: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    heading_accuracy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    strength: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    stamina: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    jumping: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    aggression: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    gk_diving: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    goalkeeping_diving: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    gk_handling: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    goalkeeping_handling: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    gk_kicking: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    goalkeeping_kicking: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    gk_positioning: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    goalkeeping_positioning: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    gk_reflexes: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    goalkeeping_reflexes: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    strict: false,
    collection: "players"
  }
);

module.exports = mongoose.model("Player", playerSchema);
