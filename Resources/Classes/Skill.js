export class Skill {
  /**
   * 技能类的构造函数
   * @param {number} id - 技能的唯一标识符。
   * @param {number} [skillCd=3] - 技能的冷却时间，默认为3。
   * @param {number} [learningCost=3] - 学习技能的消耗成本，默认为3。
   * @param {string} [skillName="Skill"] - 技能的名称，默认为"Skill"。
   * @param {string} [skillDesc="A Skill"] - 技能的描述，默认为"A Skill"。
   */
  constructor(
    id,
    skillCD = 3,
    learningCost = 3,
    skillName = "Skill",
    skillDesc = "A Skill"
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
      }
    }
    return this;
  }
  /**
   * 当技能被使用时触发的函数。
   * 子类可重写此方法以定义技能的效果。
   * @param {Player|Monster} source - 触发技能的来源对象（玩家或怪物）。
   * @param {Player|Monster} target - 技能的目标对象（玩家或怪物）。
   * @returns {Promise<void>}
   */
  onUse(source, target) {
    // 子类应重写此方法以定义技能的效果；
    // 主动类技能主要在此编写代码
    return new Promise((resolve) => {
      resolve();
    });
  }

  /**
   * 触发技能的函数。如果技能不处于冷却状态，则触发技能效果，并开始冷却计时。
   * 如果技能处于冷却状态，则增加冷却计数器，当计数器达到冷却时间时，技能结束冷却状态。
   * @param {Player|Monster} source - 触发技能的来源对象（玩家或怪物）。
   * @param {Player|Monster} target - 技能的目标对象（玩家或怪物）。
   * @returns {Promise<void>}
   */
  triggerSkill(source, target,battle) {
    if (!this.isCoolingDown) {
      const next = this.onUse(source, target);
      if (next && next.addHook) {
        next.data.battle = battle
        return next.addHook("after", async (self, game) => {
          this.isCoolingDown = true;
          this.CDCounter = 0;
        });
      }
    }
    return {};
  }
}
