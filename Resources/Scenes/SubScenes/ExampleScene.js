import { SubScene } from "../../Classes/SubScene.js";
import { i18n } from "../../Classes/I18n.js";
import {
  getPlayerInstance,
  getStoryTellerElement,
  getGameInstance,
} from "../../Scripts/Shared.js";
import { InGameEvent } from "../../Classes/InGameEvent.js";
import { Player } from "../../Classes/Player.js";
import { EventPriority } from "../../Classes/GameEvent.js";
import { Battle } from "../../Classes/Battle.js";
import { Slime } from "../../Scripts/Monsters/General.js";
import { Animations } from "../../Classes/Animations.js";
class ExampleScene extends SubScene {
  constructor() {
    super("ExampleScene");
    this.textContent = i18n.t("subscene_desc_ExampleScene");
    this.addInteractiveElement(getStoryTellerElement());
  }

  /**
   * 在场景渲染前准备内容
   */
  async beforeRendered() {
    getStoryTellerElement().innerHTML = "";

    const initialText = document.createElement("p");
    getStoryTellerElement().appendChild(initialText);
    await Animations.writeWithHTML(
      initialText,
      i18n.t("example_scene_initial_text")
    );
    getStoryTellerElement().appendChild(document.createElement("hr"));
  }

  /**
   * 创建场景选项事件
   * @private
   * @returns {InGameEvent}
   */
  createSceneChoiceEvent() {
    const choices = [
      {
        text: i18n.t("example_scene_choice_1_text"),
        description: i18n.t("example_scene_choice_1_desc"),
        conditions: [
          { type: "attr", attr: "strength", value: 5 },
          { type: "attr", attr: "hp", value: 30 },
        ],
        onSelect: async () => {
          new Battle(getPlayerInstance(), new Slime());
        },
      },
      {
        text: i18n.t("example_scene_choice_2_text"),
        description: i18n.t("example_scene_choice_2_desc"),
        conditions: [],
        onSelect: async () => {
          const feedbackText = document.createElement("p");
          getStoryTellerElement().appendChild(feedbackText);
          Animations.writeWithHTML(
            feedbackText,
            i18n.t("example_scene_choice_2_feedback")
          );
        },
      },
    ];
    return new InGameEvent({
      id: "ExampleSceneChoice",
      choices,
      writer: (key) => {
        switch (key) {
          case "name":
            return i18n.t("example_scene_event_name");
          case "content":
            return i18n.t("example_scene_event_content");
          default:
            return i18n.t(key);
        }
      },
    });
  }

  /**
   * 创建继续按钮
   * @private
   * @returns {HTMLButtonElement}
   */
  createContinueButton() {
    const continueButton = document.createElement("button");
    continueButton.innerHTML = i18n.t("example_scene_continue_button");
    continueButton.onclick = () => {
      continueButton.remove();
      const player = getPlayerInstance();
      player.moveTo("#ExampleScene");
    };
    return continueButton;
  }

  /**
   * 处理玩家初次进入场景的物品发放
   * @private
   */
  handleFirstTimeItems() {
    const player = getPlayerInstance();
    if (!player.getFlag("gived_weapon")) {
      player.giveItem("broken_hero_sword");
      player.setFlag("gived_weapon", true);
    }
  }

  /**
   * 场景渲染后的处理
   */
  onRendered() {
    const game = getGameInstance();
    
    // 处理首次进入的物品发放
    this.handleFirstTimeItems();

    // 创建主选项事件
    const choiceEvent = this.createSceneChoiceEvent();

    // 添加事件完成后的处理
    choiceEvent.addHook("after", async () => {
      const continueButton = this.createContinueButton();
      getStoryTellerElement().appendChild(continueButton);
      await Animations.write(
        continueButton,
        i18n.t("example_scene_continue_button")
      );
    });

    // 添加事件超时处理
    // choiceEvent.addHook("before", async () => {
    //   const timeoutWarning = document.createElement("p");
    //   timeoutWarning.className = "timeout-warning";
    //   timeoutWarning.style.display = "none";
    //   timeoutWarning.innerHTML = i18n.t("example_scene_timeout_warning");
    //   getStoryTellerElement().appendChild(timeoutWarning);

    //   // 在即将超时时显示警告
    //   setTimeout(() => {
    //     timeoutWarning.style.display = "block";
    //   }, 150000); // 2分30秒后显示警告
    // });

    // 创建事件
    game.createEvent(choiceEvent);
  }

  /**
   * 更新场景
   */
  updateSelf() {
    super.updateSelf();
    
    // 移除任何过时的警告信息
    const warnings = getStoryTellerElement().querySelectorAll('.timeout-warning');
    warnings.forEach(warning => warning.remove());
  }
}

export default ExampleScene;