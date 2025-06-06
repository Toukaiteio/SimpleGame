import { Skill } from "../../Classes/Skill.js";
import { i18n } from "../../Classes/I18n.js";
import {
  getPlayerInstance,
  getGameInstance,
  getUIInstance,
} from "../Shared.js";
class HeavyHit extends Skill {
  constructor() {
    super(
      "HeavyHit",
      1,
      1,
      i18n.t("skill_HeavyHit_name"),
      i18n.t("skill_HeavyHit_desc")
    ); // 初始化技能
    this.isAutoTrigger = true; // 允许在技能可用时被自动发动
  }
  onUse(source, target) { // 在被使用时触发的函数 （主动技能使用onUse 被动技能使用onLearned）
    const game = getGameInstance(); // 获取Game实例
    return game.insertEvent( // createEvent为插入执行一个事件
                      // insertEvent为在事件流里添加一个新事件(在前边的事件结算结束后才开始执行) 
      game.eventWrapper( // 创建事件的函数
        this.id + "_onUse", // 事件类型(名称)
        { // 事件所携带的数据 在事件的回调中使用self.data调用此处
          skill: this,
          source: source, // 技能发起者 Player类 或 Monster类
          target: target, // 技能目标 Player类 或 Monster类
          player: getPlayerInstance(),
        },
        { // 事件不同时机的回调
          during: async (self, game) => { // during 时机应将所有所需的数据写入data，如无需要则不需写
            self.data.attackPower = await self.data.source.getNextAttribute(
              "strength"
            ); // 获取发起者的 strength 属性
          },
          after: async (self, game) => { // after 时机用于执行事件所有的功能（所需数据应从self.data获取）
            if (self.data.battle) {
              const next = self.data.battle.onDamaged( // 调用Battle类的onDamaged函数
                self.data.source, // 此函数会创建一个 onDamaged 事件
                self.data.target,
                self
              );
              next.data.skill = self.data.skill; // 为 onDamaged 事件添加将来需要调用的数据
              next.addHook("after", async (self, game) => { // 为 onDamaged 事件添加after时机的钩子
                                                            // 钩子在事件同时机之后执行
                const current = getUIInstance().getCurrentScene(); // 获取当前场景 Scene类 | SubScene类
                if (current.isSub && current.battleLogs) { // 若存在战斗日志函数则添加新日志
                  current.battleLogs.push(
                    i18n.f("skill_use_text", {
                      SkillName: self.data.skill.skillName,
                      DamageNumber: self.data.attackEvent.data.attackPower,
                    })
                  );
                }
                getUIInstance().update();
              });
              // onDamaged事件在该技能事件结束后被触发
            }
          },
        }
      )
    );
  }
}
export const General_Skills = {
  HeavyHit: {
    skill: HeavyHit,
    isLearnedByPlayer: true,
  },
};
