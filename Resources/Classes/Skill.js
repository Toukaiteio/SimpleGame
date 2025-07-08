/**
 * Represents a skill that can be learned and used by characters (Player or Monster).
 * Handles skill cooldowns and provides a base structure for specific skill implementations.
 */
export class Skill {
  /**
   * 技能类的构造函数
   * @param {number} id - 技能的唯一标识符。
   * @param {number} [skillCd=3] - 技能的冷却时间，默认为3。
   * @param {number} [learningCost=3] - 学习技能的消耗成本，默认为3。
   * @param {string} [skillName="Skill"] - 技能的名称，默认为"Skill"。
   * @param {string} [skillDesc="A Skill"] - 技能的描述，默认为"A Skill"。
   * @param {object} [cost=null] - 技能的消耗，默认为null。
   */
  constructor(
    id,
    skillCD = 3,
    learningCost = 3,
    skillName = "Skill",
    skillDesc = "A Skill",
    cost = null
  ) {
    this.id = id;
    this.isCoolingDown = false; // 是否处于冷却状态
    this.skillCD = skillCD; // 技能的冷却时间
    this.learningCost = learningCost; // 学习该技能的成本
    this.skillName = skillName; // 技能的名称
    this.skillDesc = skillDesc; // 技能的描述
    this.CDCounter = 0; // 冷却计数器
    this.isPassive = false; // 被动技能标识符
    this.isAutoTrigger = false; // 是否自动发动(仅针对主动技能)
    this.cost = cost; // 新增cost属性
  }

  /**
   * 当技能被学习时触发的函数。
   * 子类可重写此方法以注册全局触发器或执行技能的初始化操作。
   * @param {Player|Monster} player - 学习该技能的玩家或怪物对象。
   */
  onLearned(player) {
    // 子类应重写此方法以注册全局触发器或初始化技能；
    // 被动类技能最主要在此编写代码
    return;
  }
  /**
   * 增加CD进度
   * @param {number} [count=1] 增加的CD进度数
   */
  coolDown(count = 1) {
    if (this.isCoolingDown) {
      this.CDCounter += count;
      if (this.CDCounter >= this.skillCD) {
        this.isCoolingDown = false;
        this.CDCounter = 0; // Reset counter when cooldown finishes
      }
    }
    return this;
  }
  /**
   * 判断技能是否可用（消耗是否满足）
   * @param {Player|Monster} source
   * @param {Player|Monster} target
   * @returns {boolean}
   */
  canUse(source, target) {
    if (!this.cost) return true;
    // 属性消耗
    if (this.cost.hp && source.status.hp < this.cost.hp) return false;
    if (this.cost.energy && source.status.energy < this.cost.energy) return false;
    if (this.cost.mp && source.status.mp < this.cost.mp) return false;
    // 物品消耗
    if (this.cost.item) {
      if (!source.hasItem || !source.hasItem(this.cost.item.id, this.cost.item.amount || 1)) return false;
    }
    // 自定义消耗
    if (typeof this.cost.custom === 'function') {
      if (!this.cost.custom(source, target)) return false;
    }
    return true;
  }
  /**
   * 实际扣除消耗
   */
  applyCost(source, target) {
    if (!this.cost) return;
    if (this.cost.hp) source.status.hp = Math.max(0, source.status.hp - this.cost.hp);
    if (this.cost.energy) source.status.energy = Math.max(0, source.status.energy - this.cost.energy);
    if (this.cost.mp) source.status.mp = Math.max(0, source.status.mp - this.cost.mp);
    if (this.cost.item && source.removeItem) {
      source.removeItem(this.cost.item.id, this.cost.item.amount || 1);
    }
    if (typeof this.cost.custom === 'function') {
      this.cost.custom(source, target, true); // 约定第三参数true为实际扣除
    }
  }
  /**
   * 当技能被使用时触发的函数。
   * 子类可重写此方法以定义技能的效果。
   * @param {Player|Monster} source - 触发技能的来源对象（玩家或怪物）。
   * @param {Player|Monster} target - 技能的目标对象（玩家或怪物）。
   * @param {Battle} [battle] - (可选) 当前战斗的上下文，如果技能在战斗中使用。
   * @returns {Promise<void> | GameEvent | object} - 可以返回Promise（用于异步操作）、GameEvent（用于集成到游戏事件系统）或简单对象。
   *                                                如果返回GameEvent, 技能冷却将会在其 'after' 钩子中启动。
   */
  onUse(source, target, battle) {
    // 子类应重写此方法以定义技能的效果；
    // 主动类技能主要在此编写代码
    // Example: return game.eventWrapper(...); or return Promise.resolve();
    return {}; // Default: synchronous action, no specific event returned
  }

  /**
   * 触发技能的函数。如果技能不处于冷却状态，则触发技能效果，并开始冷却计时。
   * @param {Player|Monster} source - 触发技能的来源对象（玩家或怪物）。
   * @param {Player|Monster} target - 技能的目标对象（玩家或怪物）。
   * @param {Battle} [battle] - (可选) 当前战斗的上下文。
   * @returns {object} - 通常是 GameEvent 或一个空对象，取决于 onUse 的实现和冷却逻辑。
   */
  triggerSkill(source, target, battle) {
    if (!this.isCoolingDown && this.canUse(source, target)) {
      this.applyCost(source, target);
      const next = this.onUse(source, target, battle);
      if (next && next.addHook) {
        if (next.data && battle) {
             next.data.battle = battle;
        } else if (battle) {
            next.data = { battle };
        }
        return next.addHook("after", async (self, game) => {
          this.isCoolingDown = true;
          this.CDCounter = 0;
        });
      }
    }
    return {};
  }
}
