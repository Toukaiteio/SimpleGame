import { GameEvent, EventPriority, EventState } from "./GameEvent.js";
import {
  getStoryTellerElement,
  getUIInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { Animations } from "./Animations.js";
import { SubScene } from "./SubScene.js";
import { UI } from "./UI.js";

/**
 * 游戏内事件类
 */
export class InGameEvent extends GameEvent {
  /**
   * @param {string|object} eventTypeOrConfig - 事件类型或配置对象
   * @param {Object<string, Function>} [options] - 选项及其回调（兼容旧用法）
   * @param {Function} [writer] - 文本生成函数（兼容旧用法）
   */
  constructor(eventTypeOrConfig, options, writer) {
    if (typeof eventTypeOrConfig === "object") {
      // 新结构
      const config = eventTypeOrConfig;
      super(
        config.id,
        { choices: config.choices, result: null },
        {
          before: async (self, game) => {
            // 监听 statusUpdate
            const hooker = game.addGlobalTrigger(
              "statusUpdate",
              "final",
              (self, game) => {
                if (
                  self.state === EventState.RUNNING ||
                  self.state === EventState.PAUSED
                ) {
                  self.updateChoiceButtons(game);
                } else {
                  game.removeGlobalTrigger("statusUpdate", "final", hooker);
                }
              }
            );
          },
          during: async (self, game) => {
            if (self.state !== "running") return;
            await self.handleEventExecution(game);
          },
        }
      );
      this.writer = config.writer || (() => "");
    } else {
      // 兼容旧用法
      super(
        eventTypeOrConfig,
        { options, result: null },
        {
          before: async (self, game) => {
            // 监听 statusUpdate
            const hooker = game.addGlobalTrigger(
              "statusUpdate",
              "final",
              (self, game) => {
                if (
                  self.state === EventState.RUNNING ||
                  self.state === EventState.PAUSED
                ) {
                  self.updateChoiceButtons(game);
                } else {
                  game.removeGlobalTrigger("statusUpdate", "final", hooker);
                }
              }
            );
          },
          during: async (self, game) => {
            if (self.state !== "running") return;
            await self.handleEventExecution(game);
          },
        }
      );
      this.writer = writer;
    }
    this.choiceButtons = [];
    this.responsePromise = new Promise((resolve) => {
      this.resolveResponse = resolve;
    });
    this.isWaitForever = true;
  }

  /**
   * 处理事件执行
   * @private
   */
  async handleEventExecution(game) {
    const player = getPlayerInstance();
    const ui = getUIInstance();
    const currentScene = ui.getCurrentScene();
    if (!this.checkExecutionConditions(player, currentScene)) {
      this.cancel();
      return;
    }
    try {
      this.displayEventContent();
      this.createChoiceButtons(game);
      const response = await this.responsePromise;
      this.cleanup();
      return response;
    } catch (error) {
      console.error("Error in InGameEvent execution:", error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * 检查事件是否可以执行
   * @private
   */
  checkExecutionConditions(player, currentScene) {
    // 不在战斗场景时才能执行
    if (player.currentLocation === "#BattleScene") {
      return false;
    }

    // 确保在正确的场景类型中
    if (!(currentScene instanceof SubScene)) {
      return false;
    }

    return true;
  }

  /**
   * 显示事件内容
   * @private
   */
  displayEventContent() {
    // 显示事件标题和内容
    this.writer("name");
    this.writer("content");

    // 处理描述性元素
    // this.setupDescriptions();
  }

  /**
   * 设置描述性元素的工具提示
   * @private
   * @deprecated 现在标注在GameInit中通过事件监听自动完成
   */
  setupDescriptions() {
    const elements = getStoryTellerElement().querySelectorAll(
      "span[hasDescription]"
    );

    elements.forEach((element) => {
      if (!element.hasTooltip) {
        const title = element.textContent;
        const description =
          element.getAttribute("data-description") ||
          i18n.th(element.getAttribute("data-description-at"));

        Animations.attachHoverDescription(element, title, description);
        element.hasTooltip = true;
      }
    });
  }

  /**
   * 创建选项按钮（支持新结构）
   * @private
   */
  createChoiceButtons(game) {
    // 新结构：this.data.choices
    if (this.data.choices) {
      const player = getPlayerInstance();
      this.choiceButtons = this.data.choices.map((choice, idx) => {
        const btn = document.createElement("button");
        btn.innerText = choice.text;
        btn.setAttribute("hasDescription", "true");
        btn.setAttribute("data-description", choice.description || "");
        // 生成条件描述HTML
        const condHtml = (choice.conditions || [])
          .map((cond) => {
            const { result, desc } = InGameEvent.checkCondition(player, cond);
            return `<div style=\"color:${
              result ? "lightgreen" : "lightred"
            }\">${desc}</div>`;
          })
          .join("");
        // 悬浮提示
        btn.addEventListener("mouseenter", (e) => {
          const html = `
                        <div>${choice.description || ""}</div>
                        <div>${condHtml}</div>
                    `;
          Animations.createTooltip(html, e, true);
        });
        // 可选性
        const canSelect = (choice.conditions || []).every(
          (cond) => InGameEvent.checkCondition(player, cond).result
        );
        btn.disabled = !canSelect;
        btn.onclick = async () => {
          if (!canSelect) return;
          await choice.onSelect?.();
          this.resolveResponse({ choice, idx });
          this.complete();
        };
        return btn;
      });
      getStoryTellerElement().append(...this.choiceButtons);
    } else {
      // 兼容旧用法
      const options = {};
      for (const [key, callback] of Object.entries(this.data.options)) {
        options[this.writer(key)] = () => {
          this.handleChoice(game, key, callback);
        };
      }
      this.choiceButtons = UI.createButtons(options);
      getStoryTellerElement().append(...this.choiceButtons);
    }
  }
  /**
   * 更新并重新渲染选项按钮
   */
  updateChoiceButtons(game) {
    this.cleanup();
    this.createChoiceButtons(game);
  }
  /**
   * 处理玩家选择
   * @private
   */
  async handleChoice(game, choiceKey, callback) {
    // 创建选择事件
    const choiceEvent = new GameEvent(
      "playerMadeChoice",
      {
        originalEvent: this,
        choiceKey,
        choiceText: this.writer(choiceKey),
      },
      {
        during: async (event) => {
          if (callback instanceof Function) {
            await callback();
          }
        },
        after: async (event) => {
          this.resolveResponse(event.data);
          this.complete();
        },
      }
    );

    // 设置高优先级并立即执行
    choiceEvent.setPriority(EventPriority.HIGH);
    await game.createEvent(choiceEvent);
  }

  /**
   * 清理UI元素
   * @private
   */
  cleanup() {
    this.choiceButtons.forEach((button) => button.remove());
    this.choiceButtons = [];
  }

  /**
   * 取消事件
   */
  cancel() {
    this.cleanup();
    super.cancel();
  }
  /**
   * 比较工具函数
   * @param {number} a
   * @param {number} b
   * @param {'notless'|'greater'|'equal'|'less'|'notequal'} compareType
   * @returns {{result: boolean, op: string, opTextKey: string}}
   */
  static compareValues(a, b, compareType = "notless") {
    switch (compareType) {
      case "notless":
        return { result: a >= b, op: "≥", opTextKey: "compare_notless" };
      case "notgreater":
        return { result: a <= b, op: "≤", opTextKey: "compare_notgreater" };
      case "greater":
        return { result: a > b, op: ">", opTextKey: "compare_greater" };
      case "equal":
        return { result: a === b, op: "=", opTextKey: "compare_equal" };
      case "less":
        return { result: a < b, op: "<", opTextKey: "compare_less" };
      case "notequal":
        return { result: a !== b, op: "≠", opTextKey: "compare_notequal" };
      default:
        return { result: true, op: "", opTextKey: "" };
    }
  }
  /**
   * 条件判定工具函数
   * @param {Player} player
   * @param {object} cond
   * @returns {{result: boolean, desc: string}}
   */
  static checkCondition(player, cond) {
    switch (cond.type) {
      // 通用比较类型处理
      case "attr": {
        const compareType = cond.compare || "notless"; // 默认不小于
        const current = player.status[cond.attr] ?? 0;
        const { result, op, opTextKey } = InGameEvent.compareValues(
          current,
          cond.value,
          compareType
        );
        return {
          result,
          desc: i18n.f("check_condition_general", {
            Condition: i18n.t("status_" + cond.attr),
            Op: op,
            Value: cond.value,
            Current: current,
          }),
        };
      }
      case "item": {
        const compareType = cond.compare || "notless";
        const found = player.findItem?.(cond.item);
        const count = found ? found.count : 0;
        const { result, op, opTextKey } = InGameEvent.compareValues(
          count,
          cond.count || 1,
          compareType
        );
        return {
          result,
          desc: i18n.f("check_condition_general", {
            Condition: i18n.t(cond.item),
            Op: op,
            Value: cond.count || 1,
            Current: count,
          }),
        };
      }
      case "coin": {
        const compareType = cond.compare || "notless";
        const current = player.carrying_coins;
        const { result, op, opTextKey } = InGameEvent.compareValues(
          current,
          cond.value,
          compareType
        );
        return {
          result,
          desc: i18n.f("check_condition_general", {
            Condition: i18n.t("info_status_coin"),
            Op: op,
            Value: cond.value,
            Current: current,
          }),
        };
      }
      case "flag":
        return {
          result: !!player.getFlag(cond.flag),
          desc: i18n.f("check_condition_flag", {
            Flag: cond.flag,
          }),
        };
      case "flag_value":
        const compareType = cond.compare || "notless";
        const current = player.carrying_coins;
        const { result, op, opTextKey } = InGameEvent.compareValues(
          current,
          player.getFlag(cond.flag),
          compareType
        );
        return {
          result,
          desc: i18n.f("check_condition_general", {
            Condition: cond.flag,
            Op: op,
            Value: cond.value,
            Current: player.getFlag(cond.flag),
          }),
        };
      case "custom":
        return {
          result: cond.check(player),
          desc: cond.description,
        };
      default:
        return { result: true, desc: "" };
    }
  }
}
