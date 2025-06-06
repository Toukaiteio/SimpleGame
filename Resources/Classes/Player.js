import { Buff_List } from "../Scripts/Buffs/General.js";
import { General_Skills } from "../Scripts/Skills/General.js";
import { item_list } from "../Scripts/Items/Index.js";
import {
  getUIInstance,
  getGameInstance,
  getMapInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import GameStoryTeller from "../Scenes/GameStoryTeller.js";
export class Monster {
  /**
   * 构造函数，初始化怪物的各项属性和状态。
   * @param {object} [status={}] 怪物属性(Status) 包括体力上限、力量、智力、魅力、幸运、认知、精力等。
   * @param {string} [name="Monster"] 怪物名称(Name)
   * @param {Function} [monsterDrops=()=>{return;}] 怪物掉落(MonsterDrops) 在怪物死亡后触发。
   */
  constructor(
    status = {},
    name = "Monster",
    monsterDrops = () => {
      return;
    },
    isPlayer = false
  ) {
    this._status = {
      maxHp: status.maxHp || 15,
      strength: status.strength || 1,
      intelligence: status.intelligence || 0,
      charm: status.charm || 0,
      luck: status.luck || 0,
      cognition: status.cognition || 0,
      energy: status.energy || 1,
      buffList: [],
    };
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
        return true;
      },
      get: (target, key, receiver) => {
        return target[key];
      },
    });
    this.name = name;
    this._status.hp = this._status.maxHp;
    this.isMonster = true;
    this._status.level = 1;
    this._status.currentExp = 0;
    this._status.skillPoints = 0;
    this.skills = [];
    this.inventory = {}; // 背包
    this.equipment = {}; // 装备槽
    this.equipmentBonus = {}; // 装备加成
    // Buff监听器会在每个Monster基类的实体被创建时被自动应用，不需要考虑被存档。
    if (!isPlayer) {
      this.monsterDrops = monsterDrops;
      this.hook = async (self, game) => {
        if (this.status.buffList.length > 0) {
          this.status.buffList
            .filter((el) => el.remainRound <= 0)
            .forEach((el2) =>
              game.globalTriggers[Buff_List[el2.buff].effect_timing[0]][
                Buff_List[el2.buff].effect_timing[1]
              ].filter((el3) => el3 !== el2.hookSymbol)
            );

          this.status.buffList = this.status.buffList.filter(
            (el) => el.remainRound > 0
          );
          if (this.deadSymbol) {
            game.removeGlobalTrigger("renderScene", "before", this.hook);
          }
        }
      };
      getGameInstance().addGlobalTrigger("renderScene", "before", this.hook);
    }
  }
  /**
   * 以该怪物身份发言
   * @param {string} message 要说的话
   */
  say(message, element) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "say",
        { message, element, entity: this },
        {
          after: async (self, game) => {
            self.data.element.innerHTML += `<span class="npcName>${i18n.t(
              self.data.entity.name
            )}</span>:${self.data.message}\n`;
          },
        }
      )
    );
  }

  /**
   * 增加Buff
   * @param {string} buffName
   * @param {number} effectRound
   * @returns
   */
  addBuff(buffName, buffReason, effectRound = 3) {
    const game = getGameInstance();
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
            const player = self.data.entity;
            const buffList = self.data.buffList;
            const buffName = self.data.buffName;
            const target = player.status.buffList.find(
              (el) => el.buff === buffName
            );
            if (!target && buffList[buffName]) {
              const buff = {
                buff: buffName,
                remainRound: self.data.effectRound,
                reason: self.data.buffReason,
              };
              buff["hookSymbol"] =
                buffList[buffName].effect_hook_wrapper(player);
              game.addGlobalTrigger(
                buffList[buffName].effect_timing[0],
                buffList[buffName].effect_timing[1],
                buff["hookSymbol"]
              );
              player.status.buffList.push(buff);
            } else {
              if (target) {
                // this.tempGlobalTriggers[eventType][timing][symbol] = { hook, life };
                target.remainRound += self.data.effectRound;
                // TODO: 两者减小的时机不同，可能出现数值不等的情况，将来考虑仅使用tempGlobalTrigger中的life来记录剩余时间。
              }
            }
          },
        }
      )
    );
  }
  /**
   * 移除Buff
   * @param {*} buffName
   */
  removeBuff(buffName) {
    const game = getGameInstance();
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
            const player = self.data.entity;
            const buffList = self.data.buffList;
            const buffName = self.data.buffName;
            const target = player.status.buffList.find(
              (el) => el.buff === buffName
            );
            if (target) {
              game.globalTriggers[buffList[target.buff].effect_timing[0]][
                buffList[target.buff].effect_timing[1]
              ].filter((el3) => el3 === target.hookSymbol);

              player.status.buffList = player.status.buffList.filter(
                (el) => el.buff !== buffName
              );
            }
          },
        }
      )
    );
  }
  /**
   * 用于寻找背包中特定物品
   * @param {String} item_id
   */
  findItem(item_id) {
    let item = null;
    let count = 0;
    if (this.inventory[item_id] && this.inventory[item_id].length > 0) {
      item = this.inventory[item_id][0];
    }
    if (item) {
      count = this.inventory[item_id][0].use_time;
    }
    return {
      item: item,
      count: count,
    };
  }
  /**
   * 增加物品到玩家背包中
   * @param {String} item_id 要给予玩家的物品ID
   * @param {number} num 要给予的数量
   */
  giveItem(item_id, num = 1) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "giveItem",
        { item_id, entity: this, num},
        {
          after: async (self, game) => {
            const player = self.data.entity;
            const id = self.data.item_id;
            const num = self.data.num;
            let next = null;
            if (player.inventory[id]) {
              const item = player.inventory[id][0];
              next = item.addUseTime(Math.max(1, num));
            } else {
              player.inventory[id] = [new item_list[id]()];
              next = player.inventory[id][0].addUseTime(Math.max(0, num - 1));
            }
            next.addHook("after", async (self,game) => {
              const ui = getUIInstance();
              if (ui.currentScene.playerBag) {
                ui.currentScene.playerBag.updateSelf(player);
              }
            });
          },
        }
      )
    );
  }

  /**
   * 恢复体力值，不超过体力上限
   * @param {number} amount 要恢复的体力值
   */
  restoreHp(amount) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "restoreHp",
        { amount, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            const amount = self.data.amount;
            player.status.hp = Math.max(
              0,
              Math.min(player.status.hp + amount, player.status.maxHp)
            );
          },
        }
      )
    );
  }

  /**
   * 返回怪物的等级
   * @returns {number} 怪物的等级
   */
  getLevel() {
    return this.status.level;
  }

  /**
   * 使用物品
   * @param {Item} item 要使用的物品
   */
  useItem(item) {
    return item.use(this);
  }
  /**
   * 移除物品
   * @param {Item} item 要移除的物品
   */
  removeItem(item_id, num = 1) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "removeItem",
        { item_id, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            // const item = self.data.item;
            const id = self.data.item_id;
            if (player.inventory[id] && player.inventory[id].length > 0) {
              const item = player.inventory[id][0];
              item.costUseTime(num);
            }
          },
        }
      )
    );
  }
  /**
   * 装备物品
   * @param {Item} item 要装备的物品
   */
  equipItem(item) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "equipItem",
        { item, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            const item = self.data.item;
            const id = item.item_id;
            if (player.inventory[id] && player.inventory[id].length > 0) {
              if (!player.equipment[equip.equip_slot]) {
                item.costUseTime(1);
                item.equip(player);
              }
            }
          },
        }
      )
    );
  }

  /**
   * 卸下装备
   * @param {Item} item 要卸下的物品
   */
  unwieldItem(item) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "unwieldItem",
        { item, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            const item = self.data.item;
            if (player.equipment[item.equip_slot] === item) {
              item.unwield(player);
              player.giveItem(item.item_id);
            }
          },
        }
      )
    );
  }
  /**
   * 获取下一次的属性值，考虑装备影响
   * @param {string} attributeName 属性名
   * @returns {Promise<void>} 计算后的属性值
   */
  getNextAttribute(attributeName) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "getNextAttribute",
        { attributeName, entity: this },
        {
          after: async (self, game) => {
            try {
              if (self.data.attributeName !== "buffList") {
                const player = self.data.entity;
                const attributeName = self.data.attributeName;
                let baseValue = player.status[attributeName] || 0;
                let equipmentBonus = 0;

                for (let slot in player.equipmentBonus) {
                  if (
                    player.equipmentBonus[slot] &&
                    player.equipmentBonus[slot][attributeName]
                  ) {
                    equipmentBonus +=
                      player.equipmentBonus[slot][attributeName];
                  }
                }

                self.data.result = baseValue + equipmentBonus;
              } else {
                self.data.result = self.data.entity.status.buffList;
              }
            } catch (error) {}
          },
        }
      )
    );
  }
  /**
   * 获得技能，添加到技能列表
   * @param {Skill} skill Skill类对象
   */
  learnSkill(skill) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "learnSkill",
        { skill, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            const skillExists = player.skills.some(
              (s) => s.id === self.data.skill.id
            );
            if (!skillExists) {
              if (self.data.skill.onLearned) self.data.skill.onLearned(player);
              player.skills.push(self.data.skill);
            }
          },
        }
      )
    );
  }
  /**
   * 使用技能，触发技能效果
   * @param {string} skillId 技能标识符
   */
  useSkill(skillId) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "useSkill",
        { skillId },
        {
          after: async (self, game) => {
            const skill = this.skills.find((s) => s.id === self.data.skillId);
            if (skill && !skill.isCoolingDown) {
              skill.triggerSkill(this, game);
            }
          },
        }
      )
    );
  }
}

/**
 * Player类定义玩家对象，包含与玩家交互所需的各种方法和属性。
 * 包括玩家的状态、经验、等级、技能、背包、装备和当前位置。
 */
export class Player extends Monster {
  /**
   * 构造函数，初始化玩家的各项属性和状态。
   * @param {object} status 玩家属性(Status) 包括体力上限、力量、智力、魅力、幸运、认知、精力等。
   * @param {string} initialLocation 玩家初始位置
   * @param {number} initialCoins 玩家初始持有的金币数
   */
  constructor(
    status = {},
    initialLocation = "#UnknownForest",
    initialCoins = 0
  ) {
    super(status, "Player", void 0, true);
    this._status = Object.assign(this._status,{
      maxHp: status.maxHp || 75,
      strength: status.strength || 3,
      intelligence: status.intelligence || 2,
      charm: status.charm || 2,
      luck: status.luck || 2,
      cognition: status.cognition || 2,
      energy: status.energy || 2,
      buffList: [],
    });

    this._status.hp = this._status.maxHp;
    this._status.level = 1;
    this._status.currentExp = 0;
    this._status.skillPoints = 0;
    this.skills = [];
    this.inventory = {}; // 背包
    this.equipment = {}; // 装备槽
    this.currentLocation = initialLocation;
    this.carrying_coins = initialCoins; // 添加的金币属性
    this.flags = {};
    getGameInstance().addGlobalTrigger(
      "renderScene",
      "before",
      async (self, game) => {
        if (this.status.buffList.length > 0) {
          this.status.buffList
            .filter((el) => el.remainRound <= 0)
            .forEach((el2) =>
              game.globalTriggers[Buff_List[el2.buff].effect_timing[0]][
                Buff_List[el2.buff].effect_timing[1]
              ].filter((el3) => el3 !== el2.hookSymbol)
            );
          this.status.buffList = this.status.buffList.filter(
            (el) => el.remainRound > 0
          );
        }
      }
    );
  }
  /**
   * 以该玩家身份发言
   * @param {string} message 要说的话
   */
  say(message, element) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "say",
        { message, element, entity: this },
        {
          after: async (self, game) => {
            self.data.element.innerHTML += `<span class="npcName>${i18n.t(
              self.data.entity.name
            )}</span>:${self.data.message}\n`;
          },
        }
      )
    );
  }
  /**
   * 添加Flag
   * @param {String} key 标记名
   * @param {any} value 标记值(不能出现方法、元素、Class对象等无法转为json的类型)
   */
  addFlag(key, value) {
    if(!this.flags[key]){
      this.flags[key] = value;
    } else {
      if(typeof value === "number") {
        this.flags[key] += value;
      } else {
        this.flags[key] = value;
      }
    };
  }
  setFlag(key, value) {
    this.flags[key] = value;
  }
  /**
   * 获取Flag
   * @param {String} key 标记名
   * @returns {any}
   */
  getFlag(key) {
    return this.flags[key] || null;
  }
  /**
   * 移除Flag
   * @param {String} key 标记名
   */
  removeFlag(key) {
    if (this.flags[key]) {
      delete this.flags[key];
    }
  }
  /**
   * 提升或降低指定属性值
   * @param {number} value 增加或减少的属性值
   * @param {string} attr 要增加或减少的属性名
   */
  modifyAttribute(value, attr) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "modifyAttribute",
        { current: this.status[attr], value, attr, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            const attr = self.data.attr;
            const value = self.data.value;
            if (player.status[attr] !== undefined) {
              player.status[attr] = Math.max(0, value);
            }
          },
        }
      )
    );
  }
  /**
   * 增加或减少玩家的经验值，并根据需要调整等级
   * @param {number} exp 增加或减少的经验值
   */
  gainExp(exp) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "gainExp",
        { exp, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            while (exp !== 0) {
              if (exp > 0) {
                let requiredExp = Math.floor(
                  100 * Math.pow(1.3, player.status.level - 1)
                );
                if (player.status.currentExp + exp >= requiredExp) {
                  exp -= requiredExp - player.status.currentExp;
                  player.levelUp(1);
                  player.status.currentExp = 0;
                } else {
                  player.status.currentExp += exp;
                  exp = 0;
                }
              } else {
                if (player.status.currentExp + exp < 0) {
                  exp += player.status.currentExp;
                  player.levelDown(1);
                  player.status.currentExp = Math.floor(
                    100 * Math.pow(1.3, player.status.level - 1)
                  );
                } else {
                  player.status.currentExp += exp;
                  exp = 0;
                }
              }
            }
          },
        }
      )
    );
  }
  /**
   * 增加或减少玩家的等级
   * @param {number} levels 增加或减少的等级数
   */
  levelUp(levels) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "levelUp",
        { levels, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            while (levels > 0) {
              player.status.level += 1;
              player.status.skillPoints += 1;
              player.status.hp = player.status.maxHp;
              levels -= 1;
            }
          },
        }
      )
    );
  }
  levelDown(levels) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "levelDown",
        { levels, entity: this },
        {
          after: async (self, game) => {
            const player = self.data.entity;
            while (levels > 0 && player.status.level > 1) {
              player.status.level -= 1;
              levels -= 1;
            }
          },
        }
      )
    );
  }
  /**
   * 增加金币数
   * @param {number} amount 要增加的金币数
   */
  addCoins(amount) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "addCoins",
        { amount, entity: this },
        {
          after: async (self, game) => {
            self.data.entity.carrying_coins += self.data.amount;
          },
        }
      )
    );
  }
  /**
   * 减少金币数
   * @param {number} amount 要减少的金币数
   */
  deductCoins(amount) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "deductCoins",
        { amount, entity: this },
        {
          after: async (self, game) => {
            self.data.entity.carrying_coins = Math.max(
              0,
              self.data.entity.carrying_coins - self.data.amount
            );
          },
        }
      )
    );
  }
  /**
   * 获取当前持有的金币数
   * @returns {number} 当前持有的金币数
   */
  getCoins() {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "getCoins",
        { entity: this },
        {
          after: async (self, game) => {
            return self.data.entity.carrying_coins;
          },
        }
      )
    );
  }
  /**
   * 返回玩家所有状态的JSON字符串
   * @returns {string} JSON字符串
   */
  getSelfJson(isNew = false) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "getStatusJson",
        { entity: this },
        {
          after: (self, game) => {
            const player = self.data.entity;
            const status = {
              skills: isNew
                ? ["HeavyHit"]
                : player.skills
                    .filter((skill) => skill != null)
                    .map((skill) => skill.id),
              inventory: Object.keys(player.inventory).map((id) => {
                return player.inventory[id].map((item) => {
                  return {
                    id: item.item_id,
                    use_time: item.use_time,
                  };
                });
              }),
              equipment: Object.keys(player.equipment).map((slot) => {
                if (player.equipment[slot])
                  return {
                    id: player.equipment[slot].item_id,
                    slot: slot,
                  };
              }),
              equipmentBonus: player.equipmentBonus,
              status: player.status,
              flags: player.flags,
              currentLocation: player.currentLocation,
              carrying_coins: player.carrying_coins,
            };
            self.data.result = JSON.stringify(status);
          },
        }
      )
    );
  }
  /**
   * 应用拥有玩家所有状态的JSON字符串
   */
  applySelfJson(jsonStr) {
    const game = getGameInstance();
    return game.createEvent(
      game.eventWrapper(
        "applySelfJson",
        { jsonStr: jsonStr, entity: this },
        {
          during: async (self, game) => {
            const player = self.data.entity;
            const jsonStr = self.data.jsonStr;

            const jsonObj = JSON.parse(jsonStr);
            if (jsonObj.hasOwnProperty("status")) {
              for (let key in jsonObj.status) {
                if (player.status.hasOwnProperty(key)) {
                  player.status[key] = jsonObj.status[key];
                }
              }
            }

            if (jsonObj.hasOwnProperty("hp")) {
              player._status.hp = jsonObj.status.hp;
            }

            if (jsonObj.hasOwnProperty("level")) {
              player._status.level = jsonObj.status.level;
            }

            if (jsonObj.hasOwnProperty("currentExp")) {
              player._status.currentExp = jsonObj.status.currentExp;
            }

            if (jsonObj.hasOwnProperty("skillPoints")) {
              player._status.skillPoints = jsonObj.status.skillPoints;
            }

            if (jsonObj.hasOwnProperty("skills")) {
              jsonObj.skills.map((skillId) => {
                const skill = new General_Skills[skillId]["skill"]();
                player.learnSkill(skill);
                // console.log(player,game);
              });
            }

            if (jsonObj.hasOwnProperty("inventory")) {
              player.inventory = {};
              for (const i of jsonObj.inventory) {
                for (const item of i) {
                  const _item = new item_list[item.id](
                    item.id
                  );
                  player.inventory[item.id] = [_item];
                  player.inventory[item.id][0].use_time = item.use_time;
                }
              }
            }

            if (jsonObj.hasOwnProperty("equipment")) {
              player.equipment = {};
              for (const item of jsonObj.equipment) {
                if(!item) continue;
                if(!player.inventory[item.id]) {
                  const _item = new item_list[item.id](
                    item.id
                  );
                  player.inventory[item.id] = [_item];
                  player.inventory[item.id][0].use_time = 0;
                }

                player.equipment[player.inventory[item.id][0].equip_slot] = player.inventory[item.id][0] // 假设每个条目是 Item 类实例
              }
              // GameStoryTeller.getInstance().playerEquipment.updateSelf(player);
            }
            if (jsonObj.hasOwnProperty("equipmentBonus")) {
              player.equipmentBonus = jsonObj.equipmentBonus;
            }
            if (jsonObj.hasOwnProperty("flags")) {
              player.flags = jsonObj.flags;
            }
            if (jsonObj.hasOwnProperty("currentLocation")) {
              player.currentLocation = jsonObj.currentLocation;
            }
            if (jsonObj.hasOwnProperty("carrying_coins")) {
              player.carrying_coins = jsonObj.carrying_coins;
            }
          },
        }
      )
    );
  }
  /**
   * 通过SceneID移动玩家，触发moveTo事件
   * @param {string} sceneName - 目的地的场景ID
   */
  moveTo(sceneName) {
    const game = getGameInstance();
    const ui = getUIInstance();
    let from;
    if (this.currentLocation.startsWith("#"))
      from =
        ui.getScene("GameStoryTeller").subScenes[
          this.currentLocation.replace("#", "")
        ];
    else from = ui.getScene(this.currentLocation);
    const that = this;
    if (sceneName.startsWith("#")) {
      if (ui.currentScene.id !== "GameStoryTeller") {
        game.createEvent(
          game.eventWrapper(
            "moveTo",
            { from: from, to: ui.getScene("GameStoryTeller"), entity: this },
            {
              during: async (self, game) => {
                self.isMid = true;
              },
              after: async (self, game) => {
                ui.displayScene(self.data.to.getId());
              },
            }
          )
        );
        from = ui.getScene("GameStoryTeller");
      }
      return game.insertEvent(
        game.eventWrapper(
          "moveTo",
          {
            from: from,
            to: ui
              .getScene("GameStoryTeller")
              .getSubScene(sceneName.replace("#", "")),
          },
          {
            after: async (self, game) => {
              ui.currentScene.switchToSubScene(self.data.to.id);
              if (self.data.to.isRenderMap)
                getMapInstance().map.highlightNode(self.data.to.id);
              that.currentLocation = self.data.to.getId();
            },
          }
        )
      );
    } else {
      return game.createEvent(
        game.eventWrapper(
          "moveTo",
          { from: from, to: ui.getScene(sceneName) },
          {
            after: async (self, game) => {
              ui.displayScene(self.data.to.id);
              if (self.data.to.isRenderMap)
                getMapInstance().map.highlightNode(self.data.to.getId());
              that.currentLocation = self.data.to.getId();
            },
          }
        )
      );
    }
  }
}
