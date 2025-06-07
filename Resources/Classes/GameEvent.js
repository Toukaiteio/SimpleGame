import { HookContext, HookList } from "../Scripts/HookRegister.js";
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
 * 事件类
 *
 * 一个游戏事件的框架
 *
 * @class GameEvent
 */
export class GameEvent {
  insertRequest = null;
  /**
   * 构造函数，初始化Event类的属性
   * @param {string} type - 事件的类型（如"TimeUpdate"）
   * @param {Object} [data={}] - 事件相关的数据
   * @param {Object} [callbacks={ before:async ()=>{return;},during:async ()=>{return;},after:async ()=>{return;}}]
   */
  constructor(
    type,
    data = {},
    callbacks = {
      before: async () => {
        return;
      },
      during: async () => {
        return;
      },
      after: async () => {
        return;
      },
    },
    timings = ["before", "during", "after"]
  ) {
    this.type = type;
    this.data = data;
    this.parentEvent = null;
    this.childEvents = [];
    this.hooks = {
      before: [],
      during: [],
      after: [],
    };
    this.paused = false;
    this.timings = timings;
    this.callbacks = callbacks;
    /**
     * 当前事件是否已取消
     * @type {boolean}
     */
    this.isCancelled = false;
    this.isFinished = false;
    /**
     * 当前执行阶段（before, during, after）
     * @type {string | null}
     */
    this.currentPhase = null;
  }

  /**
   * 添加钩子函数到事件
   * @param {string} timing - 钩子的触发时机（before, during, after）
   * @param {Promise<void>} hook - 要添加的钩子函数
   * @returns {GameEvent} - 返回自身
   */
  addHook(timing, hook) {
    if (this.hooks[timing]) {
      this.hooks[timing].push(hook);
    }
    return this;
  }

  /**
   * 执行指定时机的钩子函数
   * @param {string} timing - 钩子的触发时机（before, during, after）
   */
  async executeHooks(timing, game = null) {
    if (this.hooks[timing]) {
      await Promise.all(this.hooks[timing].map((hook) => hook(this, game)));
    }
  }

  /**
   * Executes the event, progressing through its defined timings (e.g., 'before', 'during', 'after').
   * It runs callbacks and hooks for each timing.
   * If the event is cancelled during the 'before' phase, further execution is halted.
   * If an `insertRequest` is present (e.g., a child event needs to run),
   * the current event is paused, the inserted event executes, and then the current event resumes.
   * @param {Game | null} game - The game instance, passed to callbacks and hooks.
   * @returns {Promise<any>} - The result of the event, often set in `this.data.result`.
   */
  async execute(game = null) {
    // Determine the starting phase, defaults to "before" or resumes from currentPhase if paused.
    const start = this.currentPhase || "before";
    // Iterate through the defined timings for this event (e.g., ["before", "during", "after"])
    for (let i = this.timings.indexOf(start); i < this.timings.length; i++) {
      const currentTiming = this.timings[i];
      this.currentPhase = currentTiming; // Update current phase

      // Execute the main callback for the current timing phase (if defined)
      if (this.callbacks[currentTiming]) {
        await this.callbacks[currentTiming](this, game);
      }
      // Execute any registered hooks for the current timing phase
      await this.executeHooks(currentTiming, game);

      // If the event is cancelled during the 'before' phase (or the first phase in timings array),
      // stop further processing of this event.
      if ((currentTiming === "before" || i === 0) && this.isCancelled) {
        break;
      }

      // If there's a request to insert another event (e.g., a child event created via game.createEvent()),
      // pause this event, execute the inserted event, and then resume.
      if (this.insertRequest) {
        this.paused = true; // Mark this event as paused
        await this.insertRequest(); // Execute the inserted event/logic
        this.insertRequest = null; // Clear the insert request
        this.paused = false; // Unmark as paused
      }
    }
    this.isFinished = true; // Mark the event as finished
    return this.data.result; // Return any result stored in the event's data
  }

  /**
   * 取消事件，仅在before阶段调用有效。
   * 如果事件被取消，后续的during和after阶段将不会执行。
   * @returns {GameEvent} - 返回自身。
   */
  cancel() {
    // Cancellation is only effective if called during the 'before' phase (or the first phase).
    if (this.currentPhase !== "before" && this.currentPhase !== this.timings[0]) {
      console.warn("Event can only be effectively cancelled during its 'before' phase.");
      // Allow cancellation but it might not prevent already executed parts of 'during' or 'after'
      // if called too late directly. Standard cancellation is checked after 'before' hooks.
    }
    this.isCancelled = true;
    return this;
  }

  /**
    }
    this.isCancelled = true;
    return this;
  }

  /**
   * 实现then方法，使Event类可以被await
   * @param {function} resolve - resolve函数
   * @param {function} [reject] - reject函数（可选）
   * @returns {Promise} - 返回一个Promise对象
   */
  then(resolve, reject) {
    return this.execute().then(resolve).catch(reject);
  }
  // 实现catch
  catch(reject) {
    return this.execute().catch(reject);
  }
}
