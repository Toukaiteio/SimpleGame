import {
  getUIInstance,
  getGameInstance,
  getMapInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { log } from "./Utils.js"; // Corrected path for log
import { i18n } from "./I18n.js";

// TODO: Future enhancements could include critical hits, evasion, status effects, etc.

/**
 * Manages the state and flow of a battle between a player and a monster.
 * Handles turns, actions (attack, skill use), and outcomes (victory, defeat).
 */
export class Battle {
  static isUnderBattle = false; // Tracks if any battle is currently in progress globally.
  static currentBattle = null;  // Static reference to the currently active battle instance.
  /**
   * 构造函数，初始化战斗。
   * @param {Player} player 玩家对象
   * @param {Monster} monster 怪物对象
   */
  constructor(player, monster) {
    // Ensure player and monster are provided.
    if (!player || !monster) {
        log("Error: Player or Monster is undefined. Cannot create battle.");
        // Battle.isUnderBattle should not be set if creation fails.
        // Consider throwing an error for clearer failure indication.
        // throw new Error("Player and Monster must be defined for battle.");
        return null;
    }

    if (Battle.isUnderBattle) {
      log("A battle is already running. Cannot create a new one!");
      return null; // Or perhaps return the existing battle instance: Battle.currentBattle
    }

    Battle.isUnderBattle = true;
    Battle.currentBattle = this; // Set static reference

    this.player = player;
    this.monster = monster;
    this.turn = 0; // Initialize turn count.
    this.isBattleEnd = false; // Flag to indicate if the battle has concluded.
    // this.currentBattle = this; // This instance is the current battle. Redundant with static.
    this.onEndBattleHooks = []; // Callbacks to execute when the battle ends.

    this.onBattleBegin(); // Initiate the battle sequence.
  }

  /**
   * Initiates the battle by creating and inserting an "onBattleBegin" event.
   * This event typically handles setup like transitioning to the battle scene.
   */
  onBattleBegin() {
    const game = getGameInstance();
    // const player = this.player; // Already available via this.player
    // const monster = this.monster; // Already available via this.monster
    return game.insertEvent(
      game.eventWrapper(
        "onBattleBegin",
        { battle: this, player, monster },
        {
          after: async (self, game) => {
            // 战斗开始时，记录进入战斗前场景
            self.data.battle.playerLocation = self.data.player.currentLocation;
            // 触发onBattleBegin事件发生后(此after结束)会进入到战斗场景
            // BattleScene中注册了全局钩子
          },
        }
      )
    );
  }

  /**
   * 进入下一回合的函数。
   * 控制战斗进度，Monster的回合自动结算。
   *
   */
  goNext() {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "goNext",
        { battle: this },
        {
          after: async (self, game) => {
            // Clear logs for the new turn first.
            const currentUIScene = getUIInstance().getCurrentScene();
            if (currentUIScene && currentUIScene.battleLogs && Array.isArray(currentUIScene.battleLogs)) {
                currentUIScene.battleLogs = [];
            }

            // Increment turn counter
            self.data.battle.turn += 1;
            log(`Battle turn: ${self.data.battle.turn}`);

            // --- Player's Turn ---
            if (!self.data.battle.player.deadSymbol && !self.data.battle.isBattleEnd) {
                // Player's basic attack
                self.data.battle
                  .onAttack(self.data.battle.player, self.data.battle.monster)
                  .addHook("after", async (attackEvent, game) => { // Renamed self to attackEvent for clarity
                    if (currentUIScene.battleLogs) {
                      currentUIScene.battleLogs.push(
                        i18n.f("skill_use_text", {
                          SkillName: i18n.t("skill_normal_hit"),
                          DamageNumber: attackEvent.data.attackPower, // Corrected: use attackEvent
                        })
                      );
                    }
                  });

                // Player's skills
                for (const skill of self.data.battle.player.skills) {
                  if (!skill.isCoolingDown) {
                    if (skill.isAutoTrigger) { // Consider if auto-trigger logic should be before or after main attack
                      const skillEvent = skill.triggerSkill(
                        self.data.battle.player,
                        self.data.battle.monster,
                        self.data.battle
                      );
                      if (skillEvent && skillEvent.addHook) {
                        skillEvent.addHook("after", async () => { // Removed self, game from hook as they are not used
                          skill.coolDown(); // This seems wrong, cooldown should be managed by skill.triggerSkill itself
                        });
                      }
                    }
                  } else {
                    skill.coolDown(); // Reduce cooldown counter
                  }
                }
            }

            // CHECK IF MONSTER DIED FROM PLAYER'S TURN
            if (self.data.battle.monster.status.hp <= 0 && !self.data.battle.monster.deadSymbol && !self.data.battle.isBattleEnd) {
                self.data.battle.monster.deadSymbol = true;
                self.data.battle.isBattleEnd = true; // Mark battle as ended
                self.data.battle.onMonsterDied(self.data.battle.player, self.data.battle.monster);
            }

            // --- Monster's Turn ---
            if (!self.data.battle.monster.deadSymbol && !self.data.battle.isBattleEnd) {
                if (!self.data.battle.monster.aiOnBattle) {
                  // Default AI: Monster's basic attack
                  self.data.battle.onAttack(
                    self.data.battle.monster,
                    self.data.battle.player
                  );
                  // Default AI: Monster's skills
                  for (const skill of self.data.battle.monster.skills) {
                    if (!skill.isCoolingDown) {
                      if (skill.isAutoTrigger) {
                        const skillEvent = skill.triggerSkill(
                          self.data.battle.monster,
                          self.data.battle.player,
                          self.data.battle
                        );
                        if (skillEvent && skillEvent.addHook) {
                          skillEvent.addHook("after", async () => {
                            skill.coolDown(); // Again, cooldown should be internal to skill
                          });
                        }
                      }
                    } else {
                      skill.coolDown();
                    }
                  }
                } else {
                  // Custom AI logic for monster's turn
                  self.data.battle.monster.aiOnBattle(self.data.battle);
                }

                // CHECK IF PLAYER DIED FROM MONSTER'S TURN
                if (self.data.battle.player.status.hp <= 0 && !self.data.battle.player.deadSymbol && !self.data.battle.isBattleEnd) {
                    self.data.battle.player.deadSymbol = true;
                    self.data.battle.isBattleEnd = true; // Mark battle as ended
                    self.data.battle.onPlayerDied(self.data.battle.player, self.data.battle.monster);
                }
            }

            // Final check if battle hasn't been marked as ended by specific death handlers
            // This can be simplified if the above checks correctly set isBattleEnd
            if (!self.data.battle.isBattleEnd) {
                if (self.data.battle.player.status.hp <= 0 && !self.data.battle.player.deadSymbol) {
                    self.data.battle.player.deadSymbol = true;
                    self.data.battle.isBattleEnd = true;
                    self.data.battle.onPlayerDied(self.data.battle.player, self.data.battle.monster);
                } else if (self.data.battle.monster.status.hp <= 0 && !self.data.battle.monster.deadSymbol) {
                    self.data.battle.monster.deadSymbol = true;
                    self.data.battle.isBattleEnd = true;
                    self.data.battle.onMonsterDied(self.data.battle.player, self.data.battle.monster);
                }
            }
            // The line `getUIInstance().getCurrentScene().battleLogs = [];` was moved to the beginning of this 'after' block.
          },
        }
      )
    );
  }

  /**
   * 发起攻击时调用的函数。
   * @param {Player|Monster} source 攻击发起者 (Player 或 Monster)
   * @param {Player|Monster} target 攻击目标 (Player 或 Monster)
   */
  onAttack(source, target) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "onAttack",
        { source, target },
        {
          after: async (self, game) => {
            // Simplified damage calculation: source's strength.
            // TODO: Expand with weapon damage, skills, buffs, defense, etc.
            const attackPower = await self.data.source.getNextAttribute(
              "strength"
            );
            self.data.attackPower = attackPower;
            // Delegate damage application and death checks to onDamaged.
            this.onDamaged(self.data.source, self.data.target, self); // 'self' here is the onAttack event
          },
        }
      )
    );
  }

  /**
   * 当目标收到伤害时调用。
   * @param {Player|Monster} source 攻击发起者
   * @param {Player|Monster} target 受到攻击者
   * @param {Event} attackEvent 攻击事件数据
   */
  onDamaged(source, target, attackEvent) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "onDamaged",
        { source, target, attackEvent },
        {
          after: async (self, game) => {
            if (!self.data.target.deadSymbol) {
              const damage = self.data.attackEvent.data.attackPower;

              // 减少目标的生命值
              self.data.target.status.hp = Math.max(0, self.data.target.status.hp - damage);

              // 如果目标生命值为0，触发死亡逻辑
              if (self.data.target.status.hp <= 0) {
                if (!self.data.target.isMonster) {
                  this.onPlayerDied(self.data.target, self.data.source);
                } else {
                  this.onMonsterDied(self.data.source, self.data.target);
                }
                self.data.target.deadSymbol = true;
              }

              getUIInstance().update();
            }
          },
        }
      )
    );
  }

  /**
   * 使用技能时调用的函数。
   * @param {Player|Monster} source 技能发起者 (Player 或 Monster)
   * @param {Player|Monster} target 技能目标 (Player 或 Monster)
   * @param {string} skillID 技能标识符
   */
  onUseSkill(source, target, skillID) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "onUseSkill",
        { source, target, skillID, battle: this },
        {
          after: async (self, game) => {
            const source = self.data.source;
            const target = self.data.target;
            // 检查技能是否在冷却中
            const skill = source.skills.find((s) => s.id === self.data.skillID);
            if (skill) {
              // 触发技能
              skill.triggerSkill(source, target, self.data.battle);

              // 技能的具体效果可以通过 skill.triggerSkill() 来处理
            }
          },
        }
      )
    );
  }

  /**
   * 当怪物死亡时调用。
   * @param {Player} player 玩家对象
   * @param {Monster} monster 死亡的怪物对象
   */
  onMonsterDied(player, monster) {
    this.isBattleEnd = true;
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "onMonsterDied",
        { player, monster, battle: this },
        {
          after: async (self, game) => {
            // 触发怪物掉落物品逻辑
            self.data.monster.monsterDrops(
              self.data.player,
              self.data.monster,
              self.data.battle
            );

            const leaveButton = document.createElement("button");
            leaveButton.innerText = i18n.t("battle_func_leave");
            const current = getUIInstance().getCurrentScene();
            current.interactiveElements = [];
            leaveButton.onclick = () => {
              self.data.battle.endBattle();
              current.removeInteractiveElement(leaveButton);
            };
            current.addInteractiveElement(leaveButton);
            getUIInstance().update();
          },
        }
      )
    );
  }

  /**
   * 当玩家死亡时调用的函数框架。
   * @param {Player} player 死亡的玩家对象
   * @param {Monster} monster 杀死玩家的怪物对象
   */
  onPlayerDied(player, monster) {
    this.isBattleEnd = true;
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "onPlayerDied",
        { player, monster, battle: this },
        {
          after: async (self, game) => {
            // Log player death.
            const currentUIScene = getUIInstance().getCurrentScene();
            if (currentUIScene && currentUIScene.battleLogs) {
                currentUIScene.battleLogs.push(i18n.t("battle_info_player_died"));
            }

            // Create a button to leave the battle.
            const leaveButton = document.createElement("button");
            leaveButton.innerText = i18n.t("battle_func_leave");

            if (currentUIScene) { // Ensure currentUIScene is valid
                currentUIScene.interactiveElements = []; // Clear existing buttons
                leaveButton.onclick = () => {
                  self.data.player.deadSymbol = null; // Reset dead symbol for potential future battles/revivals
                  // Player is revived with 1 HP as per design.
                  self.data.player.status.hp = 1;
                  self.data.battle.endBattle();
                  if (currentUIScene.removeInteractiveElement) { // Check if method exists
                      currentUIScene.removeInteractiveElement(leaveButton);
                  } else {
                      leaveButton.remove(); // Fallback
                  }
                };
                currentUIScene.addInteractiveElement(leaveButton);
            }
            getUIInstance().update(); // Refresh UI to show changes.
          },
        }
      )
    );
  }
  /**
   * 结束战斗钩子
   */
  onEndBattle(...callbacks) {
    this.onEndBattleHooks.push(...callbacks);
  }
  /**
   * 用于结束战斗
   */
  endBattle() {
    Battle.currentBattle = null;
    Battle.isUnderBattle = false;
    for (const i of this.onEndBattleHooks) {
      i(this);
    }
    getPlayerInstance().moveTo(this.playerLocation)
  }
}
