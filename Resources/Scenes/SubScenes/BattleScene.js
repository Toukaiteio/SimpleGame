import { SubScene } from "../../Classes/SubScene.js";
import { log } from "../../Classes/Utils.js";
import { i18n } from "../../Classes/I18n.js";
import {
  getGameInstance,
  getPlayerInstance,
  getUIInstance,
} from "../../Scripts/Shared.js";
import { Buff_List } from "../../Scripts/Buffs/General.js";
import { FastComponent } from "../../Classes/FastCompoent.js";
import { Animations } from "../../Classes/Animations.js";
import { html, render } from "../../ThirdParty/lit-html.js";
class BattleScene extends SubScene {
  constructor() {
    super("BattleScene");
    this.isAllowSave = false;
    this.textContent = i18n.t(this.id);
    this.battleLogContainer = FastComponent.BattleLogContainer();
    const game = getGameInstance();
    game.addGlobalTrigger("onBattleBegin", "after", async (self, game) => {
      const next = self.data.player.moveTo("#BattleScene");
      this.hasRoadTo = [];
      this.isBattleEnd = false;
      this.noSafeText = true;
      this.playerCardShattered = false;
      this.monsterCardShattered = false;
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
  createButton(
    name,
    content,
    callback,
    title = "",
    isForbid = false,
    extraClass = ""
  ) {
    const t = document.createElement("button");
    t.id = name;
    t.innerHTML = content;
    if (title) t.title = title;
    t.onclick = callback;
    if (isForbid) t.disabled = true;
    if (extraClass) t.classList.add(extraClass);
    return t;
  }
  addBattleLog(logEntry) {
    this.battleLogContainer.addLog(logEntry);
  }
  clearBattleLog() {
    this.battleLogContainer.clearLog();
  }
  updateSelf() {
    if (this.battleData && this.battleData.battle) {
      const player = this.battleData.player;
      const monster = this.battleData.monster;
      const battle = this.battleData.battle;

      const playerCard = FastComponent.CharacterCard(player);
      const monsterCard = FastComponent.CharacterCard(monster);

      const template = html`
        <div class="battle-layout">
            <div class="combatants-container" style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <div id="player-card-container" style="flex: 1 1 300px;">${playerCard}</div>
                <div id="monster-card-container" style="flex: 1 1 300px;">${monsterCard}</div>
            </div>
            <div class="battle-log-area battle-log-panel">
                ${this.battleLogContainer}
            </div>
            <div class="battle-tips-area">
                ${!getPlayerInstance().getFlag("FirstFight")
                    ? i18n.t("battle_tips_skill_hover") ||
                      "Tips: Hover over skills to see their effects!"
                    : ""}
            </div>
        </div>
      `;

      const container = document.createElement('div');
      render(template, container);
      this.textContent = container.innerHTML;

      setTimeout(() => {
        if (player.status.hp <= 0 && !this.playerCardShattered) {
          const playerCardElement = document.getElementById("player-card-container");
          if(playerCardElement) Animations.breakElement(playerCardElement);
          this.playerCardShattered = true;
        }
        if (monster.status.hp <= 0 && !this.monsterCardShattered) {
          const monsterCardElement = document.getElementById("monster-card-container");
          if(monsterCardElement) Animations.breakElement(monsterCardElement);
          this.monsterCardShattered = true;
        }
      }, 0);

      if (!battle.isBattleEnd) {
        this.interactiveElements = []; // Clear before re-adding
        const skillButtons = [];
        for (const skill of player.skills) {
          let buttonText = skill.skillName;
          let isCooling = skill.isCoolingDown;
          let extraClass = "";

          if (isCooling) {
            buttonText += ` (${
              i18n.f("info_skill_cooling_remain", {
                CoolingDownRoundsRemain: skill.skillCD - skill.CDCounter,
              }) || skill.skillCD - skill.CDCounter + "r"
            })`;
            extraClass = "cooling-down";
          }

          skillButtons.push(
            this.createButton(
              `${skill.id}_skillbutton`,
              buttonText,
              () => {
                if (!isCooling) {
                  battle.onUseSkill(player, monster, skill.id);
                }
              },
              (skill.isAutoTrigger ? i18n.t("skill_AutoTrigger_flag") : "") +
                skill.skillDesc,
              isCooling, // isForbid
              extraClass // new extraClass parameter
            )
          );
        }
        this.addInteractiveElement(
          ...skillButtons.concat(this.defaultIntereactives)
        );
      }
    }
  }
}
export default BattleScene;