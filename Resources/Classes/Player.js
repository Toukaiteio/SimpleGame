import { Buff_List } from "../Scripts/Buffs/General.js";
import { General_Skills } from "../Scripts/Skills/General.js";
import { item_list } from "../Scripts/Items/Index.js";
import {
  getUIInstance,
  getGameInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import GameStoryTeller from "../Scenes/GameStoryTeller.js";

/**
 * Base class for all characters in the game, including players and enemies.
 * Handles common attributes (status, inventory, equipment, skills) and actions (say, buff management, item interaction).
 */
export class Monster {
  /**
   * Constructs a Monster instance.
   * @param {object} [status={}] Initial status attributes for the monster.
   * @param {string} [name="Monster"] The name of the monster.
   * @param {Function} [monsterDrops=()=>{return;}] Callback function executed when the monster is defeated, determining drops.
   */
  constructor(
    status = {},
    name = "Monster",
    monsterDrops = () => {
      return;
    }
  ) {
    this._status = {
      maxHp: status.maxHp || 15, // Default maxHp if not provided
      strength: status.strength || 1,
      intelligence: status.intelligence || 0,
      charm: status.charm || 0,
      luck: status.luck || 0,
      cognition: status.cognition || 0, // Default cognition if not provided
      energy: status.energy || 1,       // Default energy if not provided
      buffList: [], // Initialize buff list
    };

    // Proxy for status changes to trigger "statusUpdate" event
    this.status = new Proxy(this._status, {
      set: (target, key, value, receiver) => {
        const game = getGameInstance();
        game.createEvent(
          game.eventWrapper(
            "statusUpdate",
            { entity: this, ori: target[key], key, value },
            {
              during: async (self, game) => {
                if (typeof self.data.entity._status[self.data.key] !== "undefined") {
                  self.data.entity._status[self.data.key] = self.data.value;
                  self.data.result = true;
                } else {
                  self.data.result = false;
                }
              },
            }
          )
        );
        return true; // Indicate success
      },
      get: (target, key, receiver) => {
        return target[key];
      },
    });

    this.name = name; // Set monster's name
    this._status.hp = this._status.maxHp; // Initialize current hp to maxHp
    this.isMonster = true; // Flag to identify as a monster (can be overridden by Player)
    this._status.level = 1; // Default level
    this._status.currentExp = 0; // Default current experience
    this._status.skillPoints = 0; // Default skill points
    this.skills = []; // Initialize skills array
    this.inventory = {}; // Initialize inventory object
    this.equipment = {}; // Initialize equipment slots object
    this.equipmentBonus = {}; // Initialize equipment bonus object

    this.monsterDrops = monsterDrops; // Assign the monster drops callback
    // Removed the isPlayer check and the global trigger for non-player buff updates here.
    // Buffs on monsters will be managed by specific game mechanics (e.g., battle turns, skill effects)
    // rather than a generic 'renderScene' tick, for now.
  }

  /**
   * Makes the monster say something, displayed in the UI.
   * @param {string} message The message to be spoken.
   * @param {HTMLElement} element The HTML element where the message should be displayed.
   * @returns {GameEvent} The created game event for saying the message.
   */
  say(message, element) {
    const game = getGameInstance();
    // Creates a 'say' event which, when executed, appends the message to the specified element.
    return game.createEvent(
      game.eventWrapper(
        "say",
        { message, element, entity: this },
        {
          after: async (self, game) => {
            // Append the formatted message to the target HTML element.
            self.data.element.innerHTML += `<span class="npcName>${i18n.t(
              self.data.entity.name // Monster's name
            )}</span>:${self.data.message}\n`; // The message
          },
        }
      )
    );
  }

  /**
   * Adds a buff to the monster.
   * @param {string} buffName The name/ID of the buff to add.
   * @param {string} buffReason The reason or source of the buff.
   * @param {number} [effectRound=3] The duration of the buff in rounds.
   * @returns {GameEvent} The created game event for adding the buff.
   */
  addBuff(buffName, buffReason, effectRound = 3) {
    const game = getGameInstance();
    // Inserts an 'addBuff' event into the game's event queue.
    return game.insertEvent(
      game.eventWrapper(
        "addBuff",
        {
          buffName,
          effectRound,
          buffReason,
          entity: this,
          buffList: Buff_List,
        },
        {
          after: async (self, game) => {
            const entity = self.data.entity; // The monster/player receiving the buff
            const availableBuffs = self.data.buffList; // List of all defined buffs (Buff_List)
            const buffId = self.data.buffName; // ID of the buff to add
            const existingBuff = entity.status.buffList.find(
              (b) => b.buff === buffId
            );

            if (!existingBuff && availableBuffs[buffId]) { // If buff doesn't exist on entity and is a valid buff
              const newBuffData = {
                buff: buffId,
                remainRound: self.data.effectRound,
                reason: self.data.buffReason,
              };
              // Attach the buff's effect hook (if any) as a global trigger
              newBuffData["hookSymbol"] =
                availableBuffs[buffId].effect_hook_wrapper(entity);
              game.addGlobalTrigger(
                availableBuffs[buffId].effect_timing[0], // Event type to trigger on
                availableBuffs[buffId].effect_timing[1], // Timing (before/during/after)
                newBuffData["hookSymbol"] // The hook function
              );
              entity.status.buffList.push(newBuffData); // Add buff to entity's list
            } else if (existingBuff) {
              // If buff already exists, refresh its duration
              existingBuff.remainRound += self.data.effectRound;
              // TODO: Consider if refreshing duration should also re-evaluate tempGlobalTrigger life if used for buffs.
            }
          },
        }
      )
    );
  }

  /**
   * Removes a buff from the monster.
   * @param {string} buffName The name/ID of the buff to remove.
   * @returns {GameEvent} The created game event for removing the buff.
   */
  removeBuff(buffName) {
    const game = getGameInstance();
    // Inserts a 'removeBuff' event.
    return game.insertEvent(
      game.eventWrapper(
        "removeBuff",
        {
          buffName,
          entity: this,
          buffList: Buff_List,
        },
        {
          after: async (self, game) => {
            const entity = self.data.entity; // The monster/player
            const availableBuffs = self.data.buffList; // List of all defined buffs
            const buffIdToRemove = self.data.buffName; // ID of the buff to remove
            const buffInstance = entity.status.buffList.find(
              (b) => b.buff === buffIdToRemove
            );

            if (buffInstance) {
              // Remove the associated global trigger for the buff's effect
              game.removeGlobalTrigger( // Assuming a removeGlobalTrigger method exists
                availableBuffs[buffInstance.buff].effect_timing[0],
                availableBuffs[buffInstance.buff].effect_timing[1],
                buffInstance.hookSymbol
              );
              // Filter out the removed buff from the entity's buff list
              entity.status.buffList = entity.status.buffList.filter(
                (b) => b.buff !== buffIdToRemove
              );
            }
          },
        }
      )
    );
  }

  /**
   * Finds an item in the monster's inventory.
   * @param {string} item_id The ID of the item to find.
   * @returns {{item: Item|null, count: number}} An object containing the item instance (or null) and its count.
   */
  findItem(item_id) {
    let itemInstance = null;
    let itemCount = 0;
    // Assumes inventory stores items as an array under their ID, and the first element is the instance.
    if (this.inventory[item_id] && this.inventory[item_id].length > 0) {
      itemInstance = this.inventory[item_id][0];
      itemCount = itemInstance.use_time; // Assuming 'use_time' represents stack count for usable items
    }
    return {
      item: itemInstance,
      count: itemCount,
    };
  }

  /**
   * Adds an item to the monster's inventory.
   * @param {string} item_id The ID of the item to add.
   * @param {number} [num=1] The quantity of the item to add.
   * @returns {GameEvent} The created game event for giving the item.
   */
  giveItem(item_id, num = 1) {
    const game = getGameInstance();
    // Creates a 'giveItem' event.
    return game.createEvent(
      game.eventWrapper(
        "giveItem",
        { item_id, entity: this, num},
        {
          after: async (self, game) => {
            const entity = self.data.entity; // The monster/player receiving the item
            const itemId = self.data.item_id;
            const quantity = self.data.num;
            let eventContinuation = null; // To chain UI updates

            if (entity.inventory[itemId] && entity.inventory[itemId][0]) {
              // If item exists, increase its count (use_time)
              const item = entity.inventory[itemId][0];
              eventContinuation = item.addUseTime(Math.max(1, quantity));
            } else {
              // If item doesn't exist, create a new instance and add it.
              entity.inventory[itemId] = [new item_list[itemId]()];
              eventContinuation = entity.inventory[itemId][0].addUseTime(Math.max(0, quantity - 1)); // Adjust for initial creation
            }
            // Hook to update UI (e.g., player bag) after item count is changed.
            eventContinuation.addHook("after", async (itemEvent, gameInstance) => {
              const ui = getUIInstance();
              // Check if playerBag exists on currentScene (specific to GameStoryTeller)
              if (ui.currentScene && ui.currentScene.playerBag && typeof ui.currentScene.playerBag.updateSelf === 'function') {
                ui.currentScene.playerBag.updateSelf(entity);
              }
            });
          },
        }
      )
    );
  }

  /**
   * Restores HP to the monster, up to its maximum HP.
   * @param {number} amount The amount of HP to restore.
   * @returns {GameEvent} The created game event for restoring HP.
   */
  restoreHp(amount) {
    const game = getGameInstance();
    // Creates a 'restoreHp' event.
    return game.createEvent(
      game.eventWrapper(
        "restoreHp",
        { amount, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity;
            const healAmount = self.data.amount;
            entity.status.hp = Math.max( // Ensure hp doesn't go below 0
              0,
              Math.min(entity.status.hp + healAmount, entity.status.maxHp) // Ensure hp doesn't exceed maxHp
            );
          },
        }
      )
    );
  }

  /**
   * Gets the monster's current level.
   * @returns {number} The monster's level.
   */
  getLevel() {
    return this.status.level;
  }

  /**
   * Uses an item from the inventory.
   * Delegates the use action to the item itself.
   * @param {Item} item The item instance to use.
   * @returns {GameEvent} The result of the item's use() method.
   */
  useItem(item) {
    return item.use(this); // Item's use method is expected to handle its effects and return a GameEvent
  }

  /**
   * Removes an item from the monster's inventory.
   * @param {string} item_id The ID of the item to remove.
   * @param {number} [num=1] The quantity to remove.
   * @returns {GameEvent} The created game event for removing the item.
   */
  removeItem(item_id, num = 1) {
    const game = getGameInstance();
    // Creates a 'removeItem' event.
    return game.insertEvent(
      game.eventWrapper(
        "removeItem",
        { item_id, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity;
            const itemId = self.data.item_id;
            const quantity = num; // Passed from outer scope
            if (entity.inventory[itemId] && entity.inventory[itemId].length > 0) {
              const itemInstance = entity.inventory[itemId][0];
              itemInstance.costUseTime(quantity); // Item's costUseTime handles reducing count/uses
            }
          },
        }
      )
    );
  }

  /**
   * Equips an item to the monster.
   * @param {Item} item The item instance to equip.
   * @returns {GameEvent} The created game event for equipping the item.
   */
  equipItem(item) {
    const game = getGameInstance();
    // Creates an 'equipItem' event.
    return game.insertEvent(
      game.eventWrapper(
        "equipItem",
        { item, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity;
            const itemToEquip = self.data.item;
            const itemId = itemToEquip.item_id;
            // Check if item is in inventory and the corresponding equipment slot is free
            if (entity.inventory[itemId] && entity.inventory[itemId].length > 0) {
              if (!entity.equipment[itemToEquip.equip_slot]) { // Assuming item has equip_slot property
                itemToEquip.costUseTime(1); // Reduce inventory count by 1
                itemToEquip.equip(entity); // Call item's own equip logic
              }
            }
          },
        }
      )
    );
  }

  /**
   * Unwields (unequips) an item from the monster.
   * @param {Item} item The item instance to unwield.
   * @returns {GameEvent} The created game event for unwielding the item.
   */
  unwieldItem(item) {
    const game = getGameInstance();
    // Creates an 'unwieldItem' event.
    return game.insertEvent(
      game.eventWrapper(
        "unwieldItem",
        { item, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity;
            const itemToUnwield = self.data.item;
            // Check if the item is indeed equipped in its slot
            if (entity.equipment[itemToUnwield.equip_slot] === itemToUnwield) {
              itemToUnwield.unwield(entity); // Call item's own unwield logic
              entity.giveItem(itemToUnwield.item_id, 1); // Add it back to inventory
            }
          },
        }
      )
    );
  }

  /**
   * Gets the next value of a specified attribute, considering equipment bonuses.
   * @param {string} attributeName The name of the attribute (e.g., "strength", "maxHp").
   * @returns {Promise<GameEvent>} A promise that resolves with the game event, whose `data.result` will hold the calculated attribute value.
   */
  getNextAttribute(attributeName) {
    const game = getGameInstance();
    // Creates a 'getNextAttribute' event.
    return game.createEvent(
      game.eventWrapper(
        "getNextAttribute",
        { attributeName, entity: this },
        {
          after: async (self, game) => {
            try {
              if (self.data.attributeName !== "buffList") { // Buff list is handled as is, not calculated with bonuses
                const entity = self.data.entity;
                const attrName = self.data.attributeName;
                let baseValue = entity.status[attrName] || 0;
                let totalEquipmentBonus = 0;

                // Sum up bonuses from all equipped items for the given attribute
                for (let slot in entity.equipmentBonus) {
                  if (
                    entity.equipmentBonus[slot] &&
                    entity.equipmentBonus[slot][attrName]
                  ) {
                    totalEquipmentBonus +=
                      entity.equipmentBonus[slot][attrName];
                  }
                }
                self.data.result = baseValue + totalEquipmentBonus; // Final attribute value
              } else {
                // For 'buffList', return the raw list
                self.data.result = self.data.entity.status.buffList;
              }
            } catch (error) {
              // Handle potential errors, e.g., if attribute doesn't exist
              console.error(`Error calculating attribute ${self.data.attributeName}:`, error);
              self.data.result = self.data.entity.status[self.data.attributeName] || 0; // Fallback
            }
          },
        }
      )
    );
  }

  /**
   * Adds a skill to the monster's skill list.
   * @param {Skill} skill The Skill class instance to learn.
   * @returns {GameEvent} The created game event for learning the skill.
   */
  learnSkill(skill) {
    const game = getGameInstance();
    // Creates a 'learnSkill' event.
    return game.createEvent(
      game.eventWrapper(
        "learnSkill",
        { skill, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity;
            const newSkill = self.data.skill;
            const skillAlreadyLearned = entity.skills.some(
              (s) => s.id === newSkill.id // Assuming skills have unique 'id'
            );
            if (!skillAlreadyLearned) {
              if (newSkill.onLearned) newSkill.onLearned(entity); // Call skill's own onLearned hook
              entity.skills.push(newSkill);
            }
          },
        }
      )
    );
  }

  /**
   * Uses a learned skill.
   * @param {string} skillId The ID of the skill to use.
   * @returns {GameEvent} The created game event for using the skill.
   */
  useSkill(skillId) {
    const game = getGameInstance();
    // Creates a 'useSkill' event.
    return game.insertEvent(
      game.eventWrapper(
        "useSkill",
        { skillId },
        {
          after: async (self, game) => {
            const skillToUse = this.skills.find((s) => s.id === self.data.skillId);
            if (skillToUse && !skillToUse.isCoolingDown) { // Check if skill exists and is not on cooldown
              skillToUse.triggerSkill(this, game); // Delegate to skill's own trigger logic
            }
          },
        }
      )
    );
  }
}

/**
 * Represents the player character, extending the Monster class.
 * Includes player-specific attributes like current location, currency (coins),
 * and game flags, in addition to the common Monster functionalities.
 */
export class Player extends Monster {
  /**
   * Constructs a Player instance.
   * @param {object} [status={}] Initial status attributes for the player.
   * @param {string} [initialLocation="#UnknownForest"] The player's starting location ID.
   * @param {number} [initialCoins=0] The player's starting amount of coins.
   */
  constructor(
    status = {},
    initialLocation = "#UnknownForest",
    initialCoins = 0
  ) {
    // Call Monster constructor with player-specific name and undefined for monsterDrops.
    super(status, "Player", undefined);

    // Override or set player-specific default status values.
    // Note: `this._status` is already initialized by `super()`, so we're modifying it here.
    this._status.maxHp = status.maxHp || 75;
    this._status.strength = status.strength || 5;
    this._status.intelligence = status.intelligence || 10;
    this._status.charm = status.charm || 45;
    this._status.luck = status.luck || 2;
    this._status.cognition = status.cognition || 100;       // Player specific default
    this._status.maxCognition = status.maxCognition || 100; // Player specific
    this._status.energy = status.energy || 100;             // Player specific default
    this._status.maxEnergy = status.maxEnergy || 100;       // Player specific
    // buffList is already initialized by Monster constructor.
    // hp is set to new maxHp by Monster constructor if maxHp changed. Or ensure it here if needed.
    this._status.hp = this._status.maxHp;


    this.isMonster = false; // Player is not a monster
    this.currentLocation = initialLocation; // Player's current location in the game world
    this.carrying_coins = initialCoins; // Player's currency
    this.flags = {}; // For story flags and other persistent player states

    // Player-specific global trigger for buff updates (e.g., decrementing round counts).
    // This remains in Player as it's tied to player's perspective/UI updates.
    getGameInstance().addGlobalTrigger(
      "renderScene", // Typically, buffs might tick on 'turnEnd' or 'timeUpdate' in a more complex system
      "before",      // or 'after' depending on when buff effects should be processed relative to other actions.
      async (self, game) => {
        if (this.status.buffList.length > 0) {
          // Decrement round counts and remove expired buffs
          // This logic might be too simplistic if buffs have complex removal conditions or on-expire effects.
          this.status.buffList.forEach(buff => {
            if (buff.remainRound > 0 && !Buff_List[buff.buff]?.no_round_limited_symbol) { // Check if buff is round-limited
              // buff.remainRound--; // Decrementing here might be one option.
                                  // Or, it's handled by the buff effect itself or a battle manager.
                                  // For now, this example assumes durations are managed elsewhere or are event-driven.
            }
          });

          const activeBuffs = this.status.buffList.filter(buff => {
            const isExpired = buff.remainRound <= 0 && !Buff_List[buff.buff]?.no_round_limited_symbol;
            if (isExpired) {
              // If a buff expires, its associated global trigger should be removed.
              // This assumes `buff.hookSymbol` stores the reference to the trigger function.
              if (buff.hookSymbol && Buff_List[buff.buff]) {
                game.removeGlobalTrigger(
                  Buff_List[buff.buff].effect_timing[0],
                  Buff_List[buff.buff].effect_timing[1],
                  buff.hookSymbol
                );
              }
            }
            return !isExpired;
          });
          if(this.status.buffList.length !== activeBuffs.length) {
            this.status.buffList = activeBuffs;
          }
        }
      }
    );
  }

  // say(message, element) method is inherited from Monster.

  /**
   * Adds or modifies a player-specific flag.
   * If the flag exists and the value is a number, it adds to the existing value.
   * Otherwise, it sets or overwrites the flag.
   * @param {string} key The name of the flag.
   * @param {any} value The value of the flag (should be JSON-serializable).
   */
  addFlag(key, value) {
    if(!this.flags[key]){ // If flag doesn't exist, create it
      this.flags[key] = value;
    } else { // If flag exists
      if(typeof value === "number" && typeof this.flags[key] === "number") { // And both new and old values are numbers
        this.flags[key] += value; // Add to existing value
      } else { // Otherwise, overwrite
        this.flags[key] = value;
      }
    };
  }

  /**
   * Sets a player-specific flag to a given value, overwriting if it exists.
   * @param {string} key The name of the flag.
   * @param {any} value The value to set for the flag.
   */
  setFlag(key, value) {
    this.flags[key] = value;
  }

  /**
   * Gets the value of a player-specific flag.
   * @param {string} key The name of the flag.
   * @returns {any|null} The value of the flag, or null if it doesn't exist.
   */
  getFlag(key) {
    return this.flags[key] || null;
  }

  /**
   * Removes a player-specific flag.
   * @param {string} key The name of the flag to remove.
   */
  removeFlag(key) {
    if (this.flags.hasOwnProperty(key)) { // Use hasOwnProperty for safer check
      delete this.flags[key];
    }
  }

  /**
   * Modifies a player's attribute to a new value.
   * Ensures the attribute value doesn't go below zero.
   * @param {number} value The new value for the attribute.
   * @param {string} attr The name of the attribute to modify (e.g., "strength", "hp").
   * @returns {GameEvent} The game event for modifying the attribute.
   */
  modifyAttribute(value, attr) {
    const game = getGameInstance();
    // Creates a 'modifyAttribute' event.
    return game.insertEvent(
      game.eventWrapper(
        "modifyAttribute",
        { current: this.status[attr], value, attr, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity; // The player
            const attributeKey = self.data.attr;
            const newValue = self.data.value;
            if (entity.status.hasOwnProperty(attributeKey)) { // Check if attribute exists on status object
              entity.status[attributeKey] = Math.max(0, newValue); // Ensure value is not negative
            }
          },
        }
      )
    );
  }

  /**
   * Adds or removes experience points (EXP) from the player, handling level ups/downs.
   * @param {number} exp The amount of EXP to gain (positive) or lose (negative).
   * @returns {GameEvent} The game event for gaining/losing EXP.
   */
  gainExp(exp) {
    const game = getGameInstance();
    // Creates a 'gainExp' event.
    return game.insertEvent(
      game.eventWrapper(
        "gainExp",
        { exp, entity: this },
        {
          after: async (self, game) => {
            let expChange = self.data.exp; // Amount of EXP to change
            const entity = self.data.entity; // The player

            while (expChange !== 0) {
              if (expChange > 0) { // Gaining EXP
                let expToNextLevel = Math.floor(
                  100 * Math.pow(1.3, entity.status.level - 1) // Example EXP formula
                );
                if (entity.status.currentExp + expChange >= expToNextLevel) {
                  expChange -= (expToNextLevel - entity.status.currentExp);
                  entity.levelUp(1); // Level up by 1
                  entity.status.currentExp = 0; // Reset current EXP for new level
                } else {
                  entity.status.currentExp += expChange;
                  expChange = 0; // All EXP processed
                }
              } else { // Losing EXP
                if (entity.status.currentExp + expChange < 0) { // If losing more EXP than current
                  expChange += entity.status.currentExp; // EXP becomes the remainder to lose from previous level
                  entity.levelDown(1); // Level down by 1
                  // Set current EXP to max of previous level (or a portion)
                  entity.status.currentExp = Math.floor(
                    100 * Math.pow(1.3, entity.status.level - 1) // Reset to max of new (lower) level
                  );
                } else {
                  entity.status.currentExp += expChange;
                  expChange = 0; // All EXP loss processed
                }
              }
            }
          },
        }
      )
    );
  }

  /**
   * Increases the player's level.
   * @param {number} levels The number of levels to increase by.
   * @returns {GameEvent} The game event for leveling up.
   */
  levelUp(levels) {
    const game = getGameInstance();
    // Creates a 'levelUp' event.
    return game.insertEvent(
      game.eventWrapper(
        "levelUp",
        { levels, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity; // The player
            let levelsToGain = self.data.levels;
            while (levelsToGain > 0) {
              entity.status.level += 1;
              entity.status.skillPoints += 1; // Gain a skill point per level
              entity.status.hp = entity.status.maxHp; // Restore HP on level up
              levelsToGain -= 1;
            }
          },
        }
      )
    );
  }

  /**
   * Decreases the player's level.
   * @param {number} levels The number of levels to decrease by.
   * @returns {GameEvent} The game event for leveling down.
   */
  levelDown(levels) {
    const game = getGameInstance();
    // Creates a 'levelDown' event.
    return game.insertEvent(
      game.eventWrapper(
        "levelDown",
        { levels, entity: this },
        {
          after: async (self, game) => {
            const entity = self.data.entity; // The player
            let levelsToLose = self.data.levels;
            while (levelsToLose > 0 && entity.status.level > 1) { // Cannot go below level 1
              entity.status.level -= 1;
              // Optionally, remove skill points or other stats on level down
              levelsToLose -= 1;
            }
          },
        }
      )
    );
  }

  /**
   * Adds coins to the player's inventory.
   * @param {number} amount The amount of coins to add.
   * @returns {GameEvent} The game event for adding coins.
   */
  addCoins(amount) {
    const game = getGameInstance();
    // Creates an 'addCoins' event.
    return game.insertEvent(
      game.eventWrapper(
        "addCoins",
        { amount, entity: this },
        {
          after: async (self, game) => {
            self.data.entity.carrying_coins += self.data.amount; // `entity` is the player
          },
        }
      )
    );
  }

  /**
   * Deducts coins from the player's inventory.
   * Ensures coins do not go below zero.
   * @param {number} amount The amount of coins to deduct.
   * @returns {GameEvent} The game event for deducting coins.
   */
  deductCoins(amount) {
    const game = getGameInstance();
    // Creates a 'deductCoins' event.
    return game.insertEvent(
      game.eventWrapper(
        "deductCoins",
        { amount, entity: this },
        {
          after: async (self, game) => {
            self.data.entity.carrying_coins = Math.max( // Ensure coins don't go below 0
              0,
              self.data.entity.carrying_coins - self.data.amount
            );
          },
        }
      )
    );
  }

  /**
   * Gets the current amount of coins the player has.
   * @returns {GameEvent} A game event whose `data.result` will hold the number of coins.
   */
  getCoins() {
    const game = getGameInstance();
    // Creates a 'getCoins' event.
    return game.insertEvent(
      game.eventWrapper(
        "getCoins",
        { entity: this },
        {
          after: async (self, game) => {
            self.data.result = self.data.entity.carrying_coins; // Store coins in event result
            return self.data.entity.carrying_coins; // Also return directly for convenience if not awaiting event
          },
        }
      )
    );
  }

  /**
   * Serializes the player's current state to a JSON string for saving.
   * @param {boolean} [isNew=false] If true, generates JSON for a new game state (e.g., default skills).
   * @returns {GameEvent} A game event whose `data.result` will hold the JSON string.
   */
  getSelfJson(isNew = false) {
    const game = getGameInstance();
    // Creates a 'getStatusJson' event.
    return game.insertEvent(
      game.eventWrapper(
        "getStatusJson",
        { entity: this },
        {
          after: (self, game) => {
            const entity = self.data.entity; // The player
            const serializedState = {
              skills: isNew // If new game, provide default skills, else serialize learned skills
                ? ["HeavyHit"] // Example default skill
                : entity.skills
                    .filter((skill) => skill != null) // Filter out any nulls if possible
                    .map((skill) => skill.id), // Store by ID
              inventory: Object.keys(entity.inventory).map((id) => {
                return entity.inventory[id].map((item) => {
                  return {
                    id: item.item_id,
                    use_time: item.use_time, // Assuming use_time is stack count or uses remaining
                  };
                });
              }).flat(), // Flatten the array of arrays if inventory structure results in it
              equipment: Object.keys(entity.equipment).map((slot) => {
                if (entity.equipment[slot]) {
                  return {
                    id: entity.equipment[slot].item_id,
                    slot: slot,
                  };
                }
                return null; // Ensure consistent return type
              }).filter(item => item != null), // Remove nulls if any slot was empty
              equipmentBonus: entity.equipmentBonus,
              status: entity.status, // The raw _status object might be better to avoid proxy issues during serialization
              flags: entity.flags,
              currentLocation: entity.currentLocation,
              carrying_coins: entity.carrying_coins,
            };
            self.data.result = JSON.stringify(serializedState);
          },
        }
      )
    );
  }

  /**
   * Applies a player state from a JSON string (e.g., when loading a game).
   * @param {string} jsonStr The JSON string representing the player's saved state.
   * @returns {GameEvent} The game event for applying the JSON state.
   */
  applySelfJson(jsonStr) {
    const game = getGameInstance();
    // Creates an 'applySelfJson' event.
    return game.createEvent(
      game.eventWrapper(
        "applySelfJson",
        { jsonStr: jsonStr, entity: this },
        {
          during: async (self, game) => {
            const entity = self.data.entity; // The player
            const savedState = JSON.parse(self.data.jsonStr);

            // Apply status properties directly to _status to bypass proxy if needed,
            // or ensure proxy handles bulk updates correctly.
            if (savedState.hasOwnProperty("status")) {
              for (let key in savedState.status) {
                if (entity._status.hasOwnProperty(key)) { // Apply to _status directly
                  entity._status[key] = savedState.status[key];
                }
              }
            }
            // Explicitly set hp, level, exp, skillPoints if they are top-level or need special handling
            if (savedState.status.hasOwnProperty("hp")) entity._status.hp = savedState.status.hp;
            if (savedState.status.hasOwnProperty("level")) entity._status.level = savedState.status.level;
            if (savedState.status.hasOwnProperty("currentExp")) entity._status.currentExp = savedState.status.currentExp;
            if (savedState.status.hasOwnProperty("skillPoints")) entity._status.skillPoints = savedState.status.skillPoints;


            if (savedState.hasOwnProperty("skills")) {
              entity.skills = []; // Clear existing skills before loading
              savedState.skills.forEach((skillId) => {
                if (General_Skills[skillId] && General_Skills[skillId]["skill"]) {
                  const skillInstance = new General_Skills[skillId]["skill"]();
                  entity.learnSkill(skillInstance); // Use learnSkill to add (ensures no duplicates if logic present)
                }
              });
            }

            if (savedState.hasOwnProperty("inventory")) {
              entity.inventory = {}; // Clear existing inventory
              // Ensure `savedState.inventory` is an array of items, not array of arrays
              savedState.inventory.forEach((itemData) => {
                 if (item_list[itemData.id]) {
                    const itemInstance = new item_list[itemData.id]();
                    itemInstance.use_time = itemData.use_time;
                    entity.inventory[itemData.id] = [itemInstance]; // Assuming inventory stores array of items per ID
                 }
              });
            }

            if (savedState.hasOwnProperty("equipment")) {
              entity.equipment = {}; // Clear existing equipment
              savedState.equipment.forEach((equipData) => {
                if (equipData && entity.inventory[equipData.id] && entity.inventory[equipData.id][0]) {
                  const itemInstance = entity.inventory[equipData.id][0];
                  // Ensure item is equipable and slot matches, then equip
                  if (itemInstance.is_equipable && itemInstance.equip_slot === equipData.slot) {
                     entity.equipment[equipData.slot] = itemInstance;
                     // Note: Item is already in inventory, equipping should not add it again.
                     // `costUseTime(1)` might be relevant if equipping consumes one from a stack.
                  }
                }
              });
            }
            if (savedState.hasOwnProperty("equipmentBonus")) entity.equipmentBonus = savedState.equipmentBonus;
            if (savedState.hasOwnProperty("flags")) entity.flags = savedState.flags;
            if (savedState.hasOwnProperty("currentLocation")) entity.currentLocation = savedState.currentLocation;
            if (savedState.hasOwnProperty("carrying_coins")) entity.carrying_coins = savedState.carrying_coins;

            // Trigger a general player update event if UI needs to refresh multiple parts
            game.insertEvent(game.eventWrapper("playerStateLoaded", { player: entity }));
          },
        }
      )
    );
  }

  /**
   * Moves the player to a different scene or sub-scene.
   * @param {string} sceneName The ID of the target scene or sub-scene (e.g., "#SubSceneID" or "SceneID").
   * @returns {GameEvent} The game event for moving the player.
   */
  moveTo(sceneName) {
    const game = getGameInstance();
    // Creates a 'moveTo' event.
    const ui = getUIInstance();
    let currentSceneObject; // The actual scene object the player is moving from

    // Determine the current scene object based on currentLocation format
    if (this.currentLocation.startsWith("#")) { // Indicates a sub-scene
      const storyTellerScene = ui.getScene("GameStoryTeller");
      if (storyTellerScene && storyTellerScene.subScenes) {
        currentSceneObject = storyTellerScene.subScenes[this.currentLocation.replace("#", "")];
      }
    } else { // Indicates a main scene
      currentSceneObject = ui.getScene(this.currentLocation);
    }

    const playerEntity = this; // Reference to the player instance for clarity in callbacks

    if (sceneName.startsWith("#")) { // Target is a sub-scene
      const targetSubSceneId = sceneName.replace("#", "");
      // If not already in GameStoryTeller, first move to it.
      if (ui.currentScene.id !== "GameStoryTeller") {
        game.createEvent(
          game.eventWrapper(
            "moveToScene", // More specific event type
            { from: currentSceneObject, to: ui.getScene("GameStoryTeller"), entity: playerEntity },
            {
              after: async (eventSelf, gameInstance) => {
                ui.displayScene(eventSelf.data.to.getId()); // Display GameStoryTeller
                // Now, create the event to move to the sub-scene
                game.insertEvent(game.eventWrapper("moveToSubScene", {
                    from: ui.getScene("GameStoryTeller"), // From is now GameStoryTeller
                    to: ui.getScene("GameStoryTeller").getSubScene(targetSubSceneId), // Target sub-scene
                    entity: playerEntity
                }, {
                    after: async (subSceneEventSelf, gameInstance2) => {
                        ui.currentScene.switchToSubScene(subSceneEventSelf.data.to.id);
                        playerEntity.currentLocation = subSceneEventSelf.data.to.getId(); // Update player location
                    }
                }));
              },
            }
          )
        );
        // Return the initial event, subsequent moves are chained within its callback
        return game.getCurrentEvent(); // Or handle promise chaining if needed
      } else {
        // Already in GameStoryTeller, just switch sub-scene
        return game.insertEvent(
          game.eventWrapper(
            "moveToSubScene",
            {
              from: currentSceneObject, // Current sub-scene or GameStoryTeller itself
              to: ui.getScene("GameStoryTeller").getSubScene(targetSubSceneId),
              entity: playerEntity
            },
            {
              after: async (eventSelf, gameInstance) => {
                ui.currentScene.switchToSubScene(eventSelf.data.to.id);
                playerEntity.currentLocation = eventSelf.data.to.getId();
              },
            }
          )
        );
      }
    } else { // Target is a main scene
      return game.createEvent(
        game.eventWrapper(
          "moveToScene",
          { from: currentSceneObject, to: ui.getScene(sceneName), entity: playerEntity },
          {
            after: async (eventSelf, gameInstance) => {
              ui.displayScene(eventSelf.data.to.id);
              playerEntity.currentLocation = eventSelf.data.to.getId();
            },
          }
        )
      );
    }
  }
}
