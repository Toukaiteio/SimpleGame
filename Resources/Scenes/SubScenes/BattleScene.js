import { SubScene } from "../../Classes/SubScene.js";
import { log } from "../../Classes/Utils.js";
import { i18n } from "../../Classes/I18n.js";
import {
  getGameInstance,
  getPlayerInstance,
  getUIInstance,
} from "../../Scripts/Shared.js";
import { Buff_List } from "../../Scripts/Buffs/General.js";
class BattleScene extends SubScene {
  constructor() {
    super("BattleScene");
    this.isAllowSave = false;
    this.textContent = i18n.t(this.id);
    // 勾住 onBattleBegin 的 after时机，将游戏场景跳转至自身;
    const game = getGameInstance();
    // 在Batlle场景被创建时会自动注册，不需要考虑被注册问题。
    game.addGlobalTrigger("onBattleBegin", "after", async (self, game) => {
      const next = self.data.player.moveTo("#BattleScene");
      // add next round button to defaultIntereactives here;
      this.hasRoadTo = [];
      this.battleLogs = [];
      this.isBattleEnd = false;
      this.noSafeText = true;
      this.defaultIntereactives = [document.createElement("br")];
      this.defaultIntereactives.push(
        this.createButton("nextround", i18n.t("battle_func_next_round"), () => {
          self.data.battle.goNext();
        })
      );
      next.data["battleData"] = {
        player: self.data.player,
        monster: self.data.monster,
        battle: self.data.battle,
      };
      next.addHook("after", async (self, game) => {
        self.data.to.battleData = self.data.battleData;
        const skillButtons = [];
        for (const i of self.data.battleData.player.skills) {
          skillButtons.push(
            this.createButton(
              `${i.id}_skillbutton`,
              i.skillName,
              () => {
                const next = self.data.battleData.battle.onUseSkill(
                  self.data.battleData.player,
                  self.data.battleData.monster,
                  i.id
                );
              },
              (i.isAutoTrigger ? i18n.t("skill_AutoTrigger_flag") : "") +
                i.skillDesc
            )
          );
        }
        this.interactiveElements = [];
        this.addInteractiveElement(
          ...skillButtons.concat(this.defaultIntereactives)
        );
        this.parentScene.render(getUIInstance().gameContainer);
      });
    });
  }
  createButton(name, content, callback, title = "", isForbid = false, extraClass = "") {
    const t = document.createElement("button");
    t.id = name;
    t.innerHTML = content;
    if (title) t.title = title;
    t.onclick = callback;
    if (isForbid) t.disabled = true;
    if (extraClass) t.classList.add(extraClass);
    return t;
  }
  updateSelf() {
    if (this.battleData && this.battleData.battle) {
      const player = this.battleData.player;
      const monster = this.battleData.monster;
      const battle = this.battleData.battle;

      let playerBuffsHTML = '<h4>Buffs:</h4>';
      if (player.status.buffList.length > 0) {
        player.status.buffList.forEach(buff => {
          const buffName = i18n.t(`buff_${buff.buff}_name`) || buff.buff;
          const rounds = Buff_List[buff.buff]?.no_round_limited_symbol ? 'Persistent' : `${buff.remainRound}r`;
          playerBuffsHTML += `<div>[B] ${buffName} (${rounds}) - ${i18n.t(Buff_List[buff.buff]?.effect_desc) || ''}</div>`;
        });
      } else {
        playerBuffsHTML += `<div>${i18n.t('battle_no_player_buffs') || 'No active buffs.'}</div>`;
      }

      let monsterBuffsHTML = '<h4>Buffs:</h4>';
      if (monster.status.buffList.length > 0) {
        monster.status.buffList.forEach(buff => {
          const buffName = i18n.t(`buff_${buff.buff}_name`) || buff.buff;
          const rounds = Buff_List[buff.buff]?.no_round_limited_symbol ? 'Persistent' : `${buff.remainRound}r`;
          monsterBuffsHTML += `<div>[B] ${buffName} (${rounds}) - ${i18n.t(Buff_List[buff.buff]?.effect_desc) || ''}</div>`;
        });
      } else {
        monsterBuffsHTML += `<div>${i18n.t('battle_no_monster_buffs') || 'No active buffs.'}</div>`;
      }

      const playerHpPercentage = Math.max(0, (player.status.hp / player.status.maxHp) * 100);
      const monsterHpPercentage = Math.max(0, (monster.status.hp / monster.status.maxHp) * 100);

      this.textContent = `
        <div class="battle-layout">
            <div class="combatants-container">
                <div class="combatant-info player-info">
                    <h3>${i18n.t(player.name) || player.name}</h3>
                    <div class="health-bar-container">
                        <div class="health-bar-label">HP: ${player.status.hp} / ${player.status.maxHp}</div>
                        <div class="health-bar" style="width: ${playerHpPercentage}%; background-color: green;"></div>
                    </div>
                    ${playerBuffsHTML}
                </div>
                <div class="combatant-info monster-info">
                    <h3>${i18n.t(monster.name) || monster.name}</h3>
                    <div class="health-bar-container">
                        <div class="health-bar-label">HP: ${monster.status.hp} / ${monster.status.maxHp}</div>
                        <div class="health-bar" style="width: ${monsterHpPercentage}%; background-color: red;"></div>
                    </div>
                    ${monsterBuffsHTML}
                </div>
            </div>
            <div class="battle-log-area battle-log-panel">
                <h4>${i18n.t('battle_log_title') || 'Battle Log'} (Round: ${battle.turn})</h4>
                ${this.battleLogs.join("<br/>")}
            </div>
            <div class="battle-tips-area">
                ${!getPlayerInstance().getFlag("FirstFight") ? (i18n.t('battle_tips_skill_hover') || 'Tips: Hover over skills to see their effects!') : ''}
            </div>
        </div>
      `;

      this.interactiveElements = []; // Clear before re-adding
      if (!battle.isBattleEnd) {
        const skillButtons = [];
        for (const skill of player.skills) {
          let buttonText = skill.skillName;
          let isCooling = skill.isCoolingDown;
          let extraClass = "";

          if (isCooling) {
            buttonText += ` (${i18n.f("info_skill_cooling_remain", { CoolingDownRoundsRemain: skill.skillCD - skill.CDCounter }) || (skill.skillCD - skill.CDCounter) + 'r'})`;
            extraClass = "cooling-down";
          }

          skillButtons.push(
            this.createButton(
              `${skill.id}_skillbutton`,
              buttonText,
              () => {
                if (!isCooling) { // Double check, though button should be disabled
                  battle.onUseSkill(
                    player,
                    monster,
                    skill.id
                  );
                }
              },
              (skill.isAutoTrigger ? i18n.t("skill_AutoTrigger_flag") : "") + skill.skillDesc,
              isCooling, // isForbid
              extraClass // new extraClass parameter
            )
          );
        }
        this.addInteractiveElement(...skillButtons.concat(this.defaultIntereactives));
      }
    }
  }
}
export default BattleScene;
