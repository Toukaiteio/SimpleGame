import { Buff_List } from "../Scripts/Buffs/General.js";
import { General_Skills } from "../Scripts/Skills/General.js";
import { item_list } from "../Scripts/Items/Index.js";
import {
  getUIInstance,
  getGameInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import GameStoryTeller from "../Scenes/GameStoryTeller.js";
import { Monster } from './Monster.js';
import { itemManager } from "./ItemManager.js";
import { Item } from "./Item.js";

/**
 * Represents the player character, extending the Monster class.
 * Includes player-specific attributes like current location, currency (coins),
 * and game flags, in addition to the common Monster functionalities.
 */
export class Player extends Monster {
  /**
   * Constructs a Player instance.
   * @param {object} [status={}] Initial status attributes for the player.
   * @param {string} [initialLocation="#ExampleScene"] The player's starting location ID.
   * @param {number} [initialCoins=0] The player's starting amount of coins.
   */
  constructor(
    status = {},
    initialLocation = "#ExampleScene",
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
   * 添加物品到玩家背包
   * @param {Item|string} item 物品实例或物品ID
   * @param {number} amount 数量
   * @returns {Promise} 添加物品的结果
   */
  async addItem(item, amount = 1) {
    // 如果传入的是物品ID，先创建物品实例
    if (typeof item === 'string') {
      item = await Item.create(item);
    }
    
    return itemManager.addItem(item, this, amount);
  }

  /**
   * 从玩家背包移除物品
   * @param {Item|string} item 物品实例或物品ID
   * @param {number} amount 数量
   * @returns {Promise} 移除物品的结果
   */
  async removeItem(item, amount = 1) {
    // 如果传入的是物品ID，查找背包中的物品
    if (typeof item === 'string') {
      if (this.inventory[item] && this.inventory[item].length > 0) {
        item = this.inventory[item][0];
      } else {
        return false;
      }
    }
    
    return itemManager.removeItem(item, this, amount);
  }

  /**
   * 使用物品
   * @param {Item|string} item 物品实例或物品ID
   * @returns {Promise} 使用物品的结果
   */
  async useItem(item) {
    // 如果传入的是物品ID，查找背包中的物品
    if (typeof item === 'string') {
      if (this.inventory[item] && this.inventory[item].length > 0) {
        item = this.inventory[item][0];
      } else {
        return false;
      }
    }
    
    return itemManager.useItem(item, this);
  }

  /**
   * 装备物品
   * @param {Item|string} item 物品实例或物品ID
   * @returns {Promise} 装备物品的结果
   */
  async equipItem(item) {
    // 如果传入的是物品ID，查找背包中的物品
    if (typeof item === 'string') {
      if (this.inventory[item] && this.inventory[item].length > 0) {
        item = this.inventory[item][0];
      } else {
        return false;
      }
    }
    
    return itemManager.equipItem(item, this);
  }

  /**
   * 卸下装备
   * @param {Item|string} item 物品实例或物品ID或装备槽位
   * @returns {Promise} 卸下装备的结果
   */
  async unequipItem(item) {
    // 如果传入的是装备槽位，查找该槽位的装备
    if (typeof item === 'string' && this.equipment[item]) {
      item = this.equipment[item];
    } else if (typeof item === 'string' && this.inventory[item] && this.inventory[item].length > 0) {
      // 如果传入的是物品ID，查找背包中的物品
      item = this.inventory[item][0];
    }
    
    return itemManager.unequipItem(item, this);
  }

  /**
   * 获取物品列表
   * @param {string} [filter] 过滤条件（可选）
   * @returns {Array<Item>} 物品列表
   */
  getItems(filter) {
    const items = [];
    
    Object.keys(this.inventory).forEach(itemId => {
      this.inventory[itemId].forEach(item => {
        if (!filter || 
            (filter === 'usable' && item.is_usable) || 
            (filter === 'equipable' && item.is_equipable) ||
            (filter === 'enhanceable' && item.is_enhanceable) ||
            (filter === 'tradeable' && item.is_tradeable)) {
          items.push(item);
        }
      });
    });
    
    return items;
  }

  /**
   * 获取已装备物品列表
   * @returns {Object} 已装备物品列表，按槽位分类
   */
  getEquippedItems() {
    return this.equipment;
  }

  /**
   * 获取特定槽位的装备
   * @param {string} slot 装备槽位
   * @returns {Item|null} 装备物品或null
   */
  getEquipment(slot) {
    return this.equipment[slot] || null;
  }

  /**
   * 检查是否拥有特定物品
   * @param {string} itemId 物品ID
   * @param {number} [amount=1] 数量
   * @returns {boolean} 是否拥有
   */
  hasItem(itemId, amount = 1) {
    if (!this.inventory[itemId]) {
      return false;
    }
    
    let totalUseTime = 0;
    this.inventory[itemId].forEach(item => {
      totalUseTime += item.use_time;
    });
    
    return totalUseTime >= amount;
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
                    use_time: item.use_time,
                    item_status: item.item_status
                  };
                });
              }).flat(), // Flatten the array of arrays if inventory structure results in it
              equipment: Object.keys(entity.equipment).map((slot) => {
                if (entity.equipment[slot]) {
                  return {
                    id: entity.equipment[slot].item_id,
                    slot: slot,
                    item_status: entity.equipment[slot].item_status
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
              // 使用新的Item.create方法创建物品
              for (const itemData of savedState.inventory) {
                const itemInstance = await Item.create(itemData.id);
                if (itemInstance) {
                  itemInstance.use_time = itemData.use_time;
                  if (itemData.item_status) {
                    itemInstance.item_status = itemData.item_status;
                  }
                  
                  if (!entity.inventory[itemData.id]) {
                    entity.inventory[itemData.id] = [];
                  }
                  entity.inventory[itemData.id].push(itemInstance);
                }
              }
            }

            if (savedState.hasOwnProperty("equipment")) {
              entity.equipment = {}; // Clear existing equipment
              entity.equipmentBonus = {}; // Clear equipment bonuses
              
              // 先加载所有物品到背包
              if (savedState.hasOwnProperty("inventory")) {
                // 使用新的装备系统装备物品
                for (const equipData of savedState.equipment) {
                  if (equipData && entity.inventory[equipData.id] && entity.inventory[equipData.id].length > 0) {
                    const itemToEquip = entity.inventory[equipData.id].find(item => 
                      item.is_equipable && item.equip_slot === equipData.slot
                    );
                    
                    if (itemToEquip) {
                      entity.equipment[equipData.slot] = itemToEquip;
                      entity.equipmentBonus[equipData.slot] = {
                        equipped: true,
                        ...(equipData.item_status || itemToEquip.item_status)
                      };
                    }
                  }
                }
              }
            } else if (savedState.hasOwnProperty("equipmentBonus")) {
              entity.equipmentBonus = savedState.equipmentBonus;
            }
            
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