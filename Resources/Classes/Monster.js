import { Buff_List } from "../Scripts/Buffs/General.js";
// import { General_Skills } from "../Scripts/Skills/General.js"; // Not directly used by Monster
import { item_list } from "../Scripts/Items/Index.js";
import { Item } from "./Item.js"; // Assuming Item class is in Item.js
import {
  getUIInstance,
  getGameInstance,
  // getPlayerInstance, // Monster likely doesn't need getPlayerInstance directly
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
// import GameStoryTeller from "../Scenes/GameStoryTeller.js"; // Not directly used by Monster

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
      energy: status.energy || 1, // Default energy if not provided
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
                if (
                  typeof self.data.entity._status[self.data.key] !== "undefined"
                ) {
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

            if (!existingBuff && availableBuffs[buffId]) {
              // If buff doesn't exist on entity and is a valid buff
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
              game.removeGlobalTrigger(
                // Assuming a removeGlobalTrigger method exists
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
        { item_id, entity: this, num },
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
              eventContinuation = entity.inventory[itemId][0].addUseTime(
                Math.max(0, quantity - 1)
              ); // Adjust for initial creation
            }
            // Hook to update UI (e.g., player bag) after item count is changed.
            // This might be more relevant for Player, but keeping structure if Monster can have UI.
            eventContinuation.then((itemEvent, gameInstance) => {
              const ui = getUIInstance();
              // Check if playerBag exists on currentScene (specific to GameStoryTeller)
              if (
                ui.currentScene &&
                ui.currentScene.playerBag &&
                typeof ui.currentScene.playerBag.updateSelf === "function"
              ) {
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
            entity.status.hp = Math.max(
              // Ensure hp doesn't go below 0
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
            if (
              entity.inventory[itemId] &&
              entity.inventory[itemId].length > 0
            ) {
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
            if (
              entity.inventory[itemId] &&
              entity.inventory[itemId].length > 0
            ) {
              if (!entity.equipment[itemToEquip.equip_slot]) {
                // Assuming item has equip_slot property
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
              if (self.data.attributeName !== "buffList") {
                // Buff list is handled as is, not calculated with bonuses
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
              console.error(
                `Error calculating attribute ${self.data.attributeName}:`,
                error
              );
              self.data.result =
                self.data.entity.status[self.data.attributeName] || 0; // Fallback
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
            const skillToUse = this.skills.find(
              (s) => s.id === self.data.skillId
            );
            if (skillToUse && !skillToUse.isCoolingDown) {
              // Check if skill exists and is not on cooldown
              skillToUse.triggerSkill(this, game); // Delegate to skill's own trigger logic
            }
          },
        }
      )
    );
  }
}
