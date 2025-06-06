import {
  getUIInstance,
  getGameInstance,
  getMapInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { log } from "./Game.js";
import { i18n } from "./I18n.js";
// 加入暴击、闪避等要素

export class Battle {
  static isUnderBattle = false;
  static currentBattle = null;
  /**
   * 构造函数，初始化战斗。
   * @param {Player} player 玩家对象
   * @param {Monster} monster 怪物对象
   */
  constructor(player, monster) {
    if (Battle.isUnderBattle) {
      log("A battle is running.Cant create a new one!");
      return null;
    }
    Battle.isUnderBattle = true;
    this.player = player;
    this.monster = monster;
    this.turn = 0; // 初始化回合数
    this.isBattleEnd = false;
    this.currentBattle = this;
    this.onEndBattleHooks = [];
    this.onBattleBegin();
  }

  /**
   * 战斗开始时调用的函数框架。
   */
  onBattleBegin() {
    const game = getGameInstance();
    const player = this.player;
    const monster = this.monster;
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
            // 增加回合数
            self.data.battle.turn += 1;
            // 玩家回合逻辑
            self.data.battle
              .onAttack(self.data.battle.player, self.data.battle.monster)
              .addHook("after", async (self, game) => {
                const current = getUIInstance().getCurrentScene();
                if (current.battleLogs) {
                  current.battleLogs.push(
                    i18n.f("skill_use_text", {
                      SkillName: i18n.t("skill_normal_hit"),
                      DamageNumber: self.data.attackPower,
                    })
                  );
                }
              });
            for (const i of self.data.battle.player.skills) {
              if (!i.isCoolingDown) {
                if (i.isAutoTrigger) {
                  const next = i.triggerSkill(
                    self.data.battle.player,
                    self.data.battle.monster,
                    self.data.battle
                  );
                  if (next.addHook) {
                    next.addHook("after", async (self, game) => {
                      i.coolDown();
                    });
                  }
                }
              } else {
                i.coolDown();
              }
            }
            // 怪物回合逻辑

            if (!self.data.battle.monster.aiOnBattle) {
              // 若monster没有写aiOnBattle函数
              self.data.battle.onAttack(
                self.data.battle.monster,
                self.data.battle.player
              );
              for (const i of self.data.battle.monster.skills) {
                if (!i.isCoolingDown) {
                  if (i.isAutoTrigger) {
                    const next = i.triggerSkill(
                      self.data.battle.monster,
                      self.data.battle.player,
                      self.data.battle
                    );
                    if (next.addHook) {
                      next.addHook("after", async (self, game) => {
                        i.coolDown();
                      });
                    }
                  }
                } else {
                  i.coolDown();
                }
              }
            } else {
              // aiOnBattle要处理怪物的攻击以及技能释放规律
              self.data.battle.monster.aiOnBattle(self.data.battle); // 怪物攻击玩家
            }

            // 检查战斗是否结束
            if (!self.data.battle.player.deadSymbol && !self.data.battle.monster.deadSymbol){
              if (self.data.battle.player.status.hp <= 0) {
                self.data.battle.player.deadSymbol = true;
                self.data.battle.onPlayerDied(
                  self.data.battle.player,
                  self.data.battle.monster
                );
              } else if (self.data.battle.monster.status.hp <= 0) {
                self.data.battle.monster.deadSymbol = true;
                self.data.battle.onMonsterDied(
                  self.data.battle.player,
                  self.data.battle.monster
                );
              }
            }

            getUIInstance().getCurrentScene().battleLogs = [];
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
            // 计算攻击力（这里可以根据source和target的属性实现具体的攻击逻辑）
            const attackPower = await self.data.source.getNextAttribute(
              "strength"
            ); // 假设用力量属性攻击
            self.data.attackPower = attackPower;
            // 调用 onDamaged 方法处理伤害
            this.onDamaged(self.data.source, self.data.target, self);
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
            getUIInstance()
              .getCurrentScene()
              .battleLogs.push(i18n.t("battle_info_player_died"));

            const leaveButton = document.createElement("button");
            leaveButton.innerText = i18n.t("battle_func_leave");
            const current = getUIInstance().getCurrentScene();
            current.interactiveElements = [];
            leaveButton.onclick = () => {
              self.data.player.deadSymbol = null;
              self.data.player.status.hp = 1;
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
