import { Monster } from "../../../Classes/Monster.js";
import { i18n } from "../../../Classes/I18n.js";
// Import Player if needed for drop logic, though getPlayerInstance might be sufficient.
// import { getPlayerInstance } from "../../Shared.js";

export class Slime extends Monster {
  constructor() {
    super(
      { maxHp: 20, strength: 3, ...Monster.StatusPreset.slime }, // monster status
      i18n.t("monster_slime_name", "Slime"), // monster name
      (player, monster, battle) => { // monsterDrops function
        // Example: 50% chance to drop 1-5 coins
        if (Math.random() < 0.5) {
          const coinsDropped = Math.floor(Math.random() * 5) + 1;
          player.addCoins(coinsDropped);
          // Log this drop in battle or game log if possible
          // e.g., battle.logMessage(`${monster.name} dropped ${coinsDropped} coins.`);
          console.log(`${monster.name} dropped ${coinsDropped} coins.`);
        }
        player.setFlag('slime_defeated_in_tutorial', true); // Set flag on defeat
      }
    );
    // Add any specific AI or skills for the slime if needed later
    // this.aiOnBattle = (battle) => { /* custom AI */ };
  }
}

// Optional: Add a StatusPreset for Slime if not already present in Monster.js
// Monster.StatusPreset = Monster.StatusPreset || {};
// Monster.StatusPreset.slime = { maxHp: 20, strength: 3, intelligence: 1, ... };
