import {
  getUIInstance,
  getGameInstance,
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
  static currentBattle = null; // Static reference to the currently active battle instance.
  /**
   * 构造函数，初始化战斗。
   * @param {Player} player 玩家对象
   * @param {Monster|Monster[]} monsters 怪物对象或怪物数组
   * @param {object} [options] 额外参数，如{ mode: 'all'|'sequential' }
   */
  constructor(player, monsters, options = {}) {
    if (!player || !monsters) {
      log("Error: Player or Monster is undefined. Cannot create battle.");
      return null;
    }
    if (Battle.isUnderBattle) {
      log("A battle is already running. Cannot create a new one!");
      return null;
    }
    Battle.isUnderBattle = true;
    Battle.currentBattle = this;
    this.player = player;
    // 支持单个怪物或怪物数组
    this.enemies = Array.isArray(monsters) ? monsters : [monsters];
    this.mode = options.mode || 'all'; // 'all' 同时出战, 'sequential' 车轮战
    this.turn = 0;
    this.isBattleEnd = false;
    this.onEndBattleHooks = [];
    this.currentEnemyIndex = 0; // 车轮战用
    this.onBattleBegin();
  }

  getAliveEnemies() {
    if (this.mode === 'all') {
      return this.enemies.filter(e => !e.deadSymbol && e.status.hp > 0);
    } else {
      // 车轮战只返回当前敌人
      return this.enemies[this.currentEnemyIndex] && !this.enemies[this.currentEnemyIndex].deadSymbol && this.enemies[this.currentEnemyIndex].status.hp > 0
        ? [this.enemies[this.currentEnemyIndex]] : [];
    }
  }

  getCurrentEnemy() {
    if (this.mode === 'all') {
      // 默认返回第一个活着的
      return this.getAliveEnemies()[0];
    } else {
      return this.enemies[this.currentEnemyIndex];
    }
  }

  /**
   * Initiates the battle by creating and inserting an "onBattleBegin" event.
   * This event typically handles setup like transitioning to the battle scene.
   */
  onBattleBegin() {
    const game = getGameInstance();
    const player = this.player;
    const monsters = this.enemies;
    return game.insertEvent(
      game.eventWrapper(
        "onBattleBegin",
        { battle: this, player, monsters },
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
            self.data.battle.turn += 1;
            log(`Battle turn: ${self.data.battle.turn}`);
            // --- 玩家回合 ---
            if (!self.data.battle.player.deadSymbol && !self.data.battle.isBattleEnd) {
              // 玩家普通攻击
              const targetEnemy = self.data.battle.getCurrentEnemy();
              if (targetEnemy) {
                self.data.battle.onAttack(self.data.battle.player, targetEnemy).addHook("after", async (attackEvent, game) => {
                  const currentUIScene = getUIInstance().getCurrentScene();
                  if (currentUIScene && currentUIScene.addBattleLog) {
                    const source = attackEvent.data.source.getPlayerName ? attackEvent.data.source.getPlayerName() : attackEvent.data.source.getName();
                    const target = attackEvent.data.target.getName ? attackEvent.data.target.getName() : '敌人';
                    currentUIScene.addBattleLog(`${source} 对 ${target} 进行了普通攻击，造成了 ${attackEvent.data.attackPower} 点伤害。`);
                  }
                });
              }
              // 玩家技能
              for (const skill of self.data.battle.player.skills) {
                if (!skill.isCoolingDown && skill.isAutoTrigger && skill.canUse(self.data.battle.player, targetEnemy)) {
                  const skillEvent = skill.triggerSkill(self.data.battle.player, targetEnemy, self.data.battle);
                  if (skillEvent && skillEvent.addHook) {
                    skillEvent.addHook("after", async () => { skill.coolDown(); });
                  }
                } else if (skill.isCoolingDown) {
                  skill.coolDown();
                }
              }
            }
            // 检查所有敌人是否死亡
            if (self.data.battle.getAliveEnemies().length === 0 && !self.data.battle.isBattleEnd) {
              self.data.battle.isBattleEnd = true;
              self.data.battle.onMonsterDied(self.data.battle.player, null); // null表示全部死亡
              return;
            }
            // --- 敌人回合 ---
            const enemies = self.data.battle.getAliveEnemies();
            for (const monster of enemies) {
              if (!monster.aiOnBattle) {
                // 技能优先
                const usableSkills = monster.skills.filter(skill => !skill.isCoolingDown && skill.canUse(monster, self.data.battle.player));
                usableSkills.sort((a, b) => {
                  const aPower = typeof a.estimateDamage === 'function' ? a.estimateDamage(monster, self.data.battle.player) : (a.attackPower || monster.status.strength);
                  const bPower = typeof b.estimateDamage === 'function' ? b.estimateDamage(monster, self.data.battle.player) : (b.attackPower || monster.status.strength);
                  return bPower - aPower;
                });
                let usedSkill = false;
                for (const skill of usableSkills) {
                  const skillEvent = skill.triggerSkill(monster, self.data.battle.player, self.data.battle);
                  if (skillEvent && skillEvent.addHook) {
                    skillEvent.addHook("after", async (event, game) => {
                      const currentUIScene = getUIInstance().getCurrentScene();
                      if (currentUIScene && currentUIScene.addBattleLog) {
                        const source = monster.getName ? monster.getName() : '敌人';
                        const target = self.data.battle.player.getPlayerName ? self.data.battle.player.getPlayerName() : '玩家';
                        currentUIScene.addBattleLog(`${source} 使用了技能 ${skill.skillName} 对 ${target} 造成了伤害。`);
                      }
                    });
                  }
                  usedSkill = true;
                  break;
                }
                if (!usedSkill) {
                  self.data.battle.onAttack(monster, self.data.battle.player).addHook("after", async (attackEvent, game) => {
                    const currentUIScene = getUIInstance().getCurrentScene();
                    if (currentUIScene && currentUIScene.addBattleLog) {
                      const source = monster.getName ? monster.getName() : '敌人';
                      const target = self.data.battle.player.getPlayerName ? self.data.battle.player.getPlayerName() : '玩家';
                      currentUIScene.addBattleLog(`${source} 对 ${target} 进行了普通攻击，造成了 ${attackEvent.data.attackPower} 点伤害。`);
                    }
                  });
                }
                for (const skill of monster.skills) {
                  if (skill.isCoolingDown) skill.coolDown();
                }
              } else {
                monster.aiOnBattle(self.data.battle);
              }
            }
            // 检查玩家是否死亡
            if (self.data.battle.player.status.hp <= 0 && !self.data.battle.player.deadSymbol && !self.data.battle.isBattleEnd) {
              self.data.battle.player.deadSymbol = true;
              self.data.battle.isBattleEnd = true;
              self.data.battle.onPlayerDied(self.data.battle.player, enemies[0] || null);
              return;
            }
            // 车轮战推进
            if (self.data.battle.mode === 'sequential') {
              const curIdx = self.data.battle.currentEnemyIndex;
              if (self.data.battle.enemies[curIdx] && (self.data.battle.enemies[curIdx].deadSymbol || self.data.battle.enemies[curIdx].status.hp <= 0)) {
                // 推进到下一个敌人
                self.data.battle.currentEnemyIndex++;
              }
            }
            // 回合结束后energy自然恢复
            if (self.data.battle.player && typeof self.data.battle.player.recoverEnergyInBattle === 'function') {
              const recover = self.data.battle.player.recoverEnergyInBattle();
              const currentUIScene = getUIInstance().getCurrentScene();
              if (currentUIScene && currentUIScene.addBattleLog) {
                currentUIScene.addBattleLog(`玩家每回合自然恢复${recover}点能量。`);
              }
            }
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
    if (source && typeof source.checkCognitionDebuff === 'function') {
      source.checkCognitionDebuff();
    }
    return game.insertEvent(
      game.eventWrapper(
        "onAttack",
        { source, target },
        {
          after: async (self, game) => {
            // 暴击与闪避判定
            let attackPower = await self.data.source.getNextAttribute("strength");
            let isCrit = false;
            let isDodge = false;
            // 暴击率、闪避率可根据属性/buff调整
            const critChance = (source.status.crit || 0.1); // 默认10%
            const dodgeChance = (target.status.dodge || 0.05); // 默认5%
            if (Math.random() < dodgeChance) {
              attackPower = 0;
              isDodge = true;
            } else if (Math.random() < critChance) {
              attackPower = Math.floor(attackPower * 2);
              isCrit = true;
            }
            self.data.attackPower = attackPower;
            self.data.isCrit = isCrit;
            self.data.isDodge = isDodge;
            this.onDamaged(self.data.source, self.data.target, self);
            // 日志
            const currentUIScene = getUIInstance().getCurrentScene();
            if (currentUIScene && currentUIScene.addBattleLog) {
              const sourceName = source.getPlayerName ? source.getPlayerName() : (source.getName ? source.getName() : '攻击者');
              const targetName = target.getPlayerName ? target.getPlayerName() : (target.getName ? target.getName() : '目标');
              if (isDodge) {
                currentUIScene.addBattleLog(`${targetName} 闪避了 ${sourceName} 的攻击！`);
              } else if (isCrit) {
                currentUIScene.addBattleLog(`${sourceName} 对 ${targetName} 造成了暴击！伤害：${attackPower}`);
              }
            }
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
              self.data.target.status.hp = Math.max(
                0,
                self.data.target.status.hp - damage
              );

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
    // 通过事件通知UI
    return game.insertEvent(
      game.eventWrapper(
        "onMonsterDied",
        { player, monster, battle: this },
        {
          after: async (self, game) => {
            // 仅负责数据与事件，不做UI操作
            // 掉落逻辑
            if (monster && monster.monsterDrops) {
              monster.monsterDrops(player, monster, this);
            } else if (Array.isArray(this.enemies)) {
              for (const m of this.enemies) {
                if (m && m.monsterDrops) m.monsterDrops(player, m, this);
              }
            }
            // 触发UI事件
            if (typeof this.onEndBattleHooks === 'object') {
              for (const cb of this.onEndBattleHooks) {
                cb(this);
              }
            }
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
            // 触发UI事件
            if (typeof this.onEndBattleHooks === 'object') {
              for (const cb of this.onEndBattleHooks) {
                cb(this);
              }
            }
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
    // 脱战后能量立即恢复
    if (this.player && typeof this.player.recoverEnergyFull === 'function') {
      this.player.recoverEnergyFull();
    }
    getPlayerInstance().moveTo(this.playerLocation);
  }
}
