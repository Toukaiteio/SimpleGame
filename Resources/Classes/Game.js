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
import { GameEvent, EventState, EventPriority } from "./GameEvent.js";
import { InGameEvent } from "./InGameEvent.js";
import { log } from "./Utils.js";

/**
 * 游戏类
 *
 * 负责游戏相关的大部分功能
 * 主要与事件和游戏时间相关
 *
 * @class Game
 */
export class Game {
  /**
   * 构造函数，初始化Game类的属性
   */
  constructor() {
    this.eventQueue = [];
    this.currentEvent = null;
    this.time = 0;
    this.symbol = 0;
    this.isTimePaused = false;
    this.isEventQueueRunning = false;
    this.allowSave = true;
    
    /**
     * 全局触发器列表，按照事件类型和触发时机存储。
     * @type {Object<string, Object<string, Function[]>>}
     */
    this.globalTriggers = {};
    
    /**
     * 存档内全局触发器列表，按照事件类型、触发时机以及钩子标识符存储。
     * @type {Object<string, Object<string, string[]>>}
     */
    this.globalSaveTriggers = {};
    
    /**
     * 临时全局触发器列表，按照事件类型、触发时机和 unique symbol 存储。
     * @type {Object<string, Object<string, Object<string, {hook: Function, life: number}>>>}
     */
    this.tempGlobalTriggers = {};
    
    /**
     * 记录游戏全局的设置。
     * @type {Object<string, string | boolean | number | null>}
     */
    this.gameSettings = {};
  }

  /**
   * 设置一个全局设置
   * @param {string} key - 设置键名
   * @param {string | boolean | number | null} value - 值
   */
  setGameSetting(key, value) {
    this.gameSettings[key] = value;
  }

  /**
   * 获取一个全局设置
   * @param {string} key - 设置键名
   * @returns {string | boolean | number | null}
   */
  getGameSetting(key) {
    return this.gameSettings[key] ?? null;
  }

  /**
   * 插入一个新事件到主事件队列
   * @param {GameEvent} event - 要插入的事件对象
   * @returns {GameEvent} - 插入的事件对象
   */
  insertEvent(event) {
    this.applyGlobalTriggers(event);
    
    if (!this.isEventQueueRunning) {
      // 如果当前没有事件在运行，立即执行
      this.currentEvent = event;
      this.executeEvent(event);
    } else {
      // 否则加入队列
      this.eventQueue.push(event);
      
      // 按优先级排序队列
      this.eventQueue.sort((a, b) => b.priority - a.priority);
    }
    
    return event;
  }

  /**
   * 创建并插入一个新事件作为当前正在执行事件的子事件
   * @param {GameEvent} event - 要插入的事件对象
   * @returns {GameEvent} - 插入的事件对象
   */
  createEvent(event) {
    if (!this.currentEvent) {
      // 如果没有当前事件，直接插入到主队列
      return this.insertEvent(event);
    }
    
    const parentEvent = this.currentEvent;
    
    // 检查是否允许插入
    if (!parentEvent.allowInsertion) {
      // 不允许插入，加入延迟队列
      parentEvent.defer(event);
      return event;
    }
    
    // 应用全局触发器
    this.applyGlobalTriggers(event);
    
    // 设置父子关系
    parentEvent.childEvents.push(event);
    event.parentEvent = parentEvent;
    
    // 暂停父事件
    parentEvent.pause();
    
    // 执行子事件
    const originalEvent = this.currentEvent;
    this.currentEvent = event;
    
    // 执行子事件并在完成后恢复父事件
    this.executeEvent(event).then(() => {
      if (originalEvent.state === EventState.PAUSED) {
        this.currentEvent = originalEvent;
        originalEvent.resume();
      }
    }).catch(error => {
      console.error("Error executing child event:", error);
      if (originalEvent.state === EventState.PAUSED) {
        this.currentEvent = originalEvent;
        originalEvent.resume();
      }
    });
    
    return event;
  }

  /**
   * 获取当前生效的所有全局触发器
   * @returns {Object<string, Object<string, Function[]>>} - 全局触发器列表
   */
  getGlobalTriggers() {
    return this.globalTriggers;
  }
  /**
   * 快速触发一个仅传参的事件
   * @param {string} eventType - 事件类型
   * @param {Object} data - 事件参数
   * @returns {Promise<GameEvent>} - 被触发的事件对象
   */
  async triggerEvent(eventType, data = {}) {
    const event = this.eventWrapper(eventType, data);
    this.applyGlobalTriggers(event);
    await this.executeEvent(event);
    return event;
  }

  /**
   * 为新创建的事件应用全局触发器
   * @param {GameEvent} event - 新创建的事件对象
   */
  applyGlobalTriggers(event) {
    const eventType = event.type;

    // 应用标准全局触发器
    if (this.globalTriggers[eventType]) {
      const triggers = this.globalTriggers[eventType];
      for (let timing in triggers) {
        if (triggers[timing]) {
          triggers[timing].forEach((hook) => {
            event.addHook(timing, hook);
          });
        }
      }
    }

    // 应用临时全局触发器
    if (this.tempGlobalTriggers[eventType]) {
      const tempTriggersForType = this.tempGlobalTriggers[eventType];
      for (let timing in tempTriggersForType) {
        if (tempTriggersForType[timing]) {
          const triggersForTiming = tempTriggersForType[timing];
          for (const symbol in triggersForTiming) {
            const triggerEntry = triggersForTiming[symbol];
            if (triggerEntry.life > 0) {
              // 包装原始钩子以管理其"生命"（可触发次数）
              const hookWrapper = async (...args) => {
                const result = await triggerEntry.hook(...args);
                triggerEntry.life -= 1;
                return result;
              };
              event.addHook(timing, hookWrapper);
            }
            // 清理过期的临时触发器
            if (triggerEntry.life <= 0) {
              delete triggersForTiming[symbol];
            }
          }
        }
      }
    }
  }

  /**
   * 获取下一个唯一标识符
   * @returns {String} 一个不会出现冲突的标识符
   */
  getNextSymbol() {
    return this.symbol++;
  }

  /**
   * 添加全局触发器
   * @param {string} eventType - 要监听的事件类型
   * @param {string} timing - 触发器的时机（before, during, after）
   * @param {Function | string} hook - 要添加的钩子函数或钩子标识符
   * @returns {Function} 实际添加的触发器函数
   */
  addGlobalTrigger(eventType, timing, hook) {
    // 确保此事件类型的结构存在
    if (!this.globalTriggers[eventType]) {
      this.globalTriggers[eventType] = { before: [], during: [], after: [] };
    }

    let isPersistentHook = typeof hook === "string";
    let actualHookFunction;

    if (isPersistentHook) {
      // 确保此事件类型在globalSaveTriggers中的结构存在
      if (!this.globalSaveTriggers[eventType]) {
        this.globalSaveTriggers[eventType] = {
          before: [],
          during: [],
          after: [],
        };
      }
      
      // 存储字符串标识符以便保存
      if (!this.globalSaveTriggers[eventType][timing].includes(hook)) {
        this.globalSaveTriggers[eventType][timing].push(hook);
      }

      // 将字符串标识符解析为HookList中的实际函数
      if (HookList && HookList[hook]) {
        actualHookFunction = (...args) => {
          // 为每次调用创建新的上下文，合并默认HookContext和自引用
          const executionContext = Object.assign({}, HookContext, {
            self: actualHookFunction,
          });
          return HookList[hook].bind(executionContext)(...args);
        };
      } else {
        console.error(`Hook with identifier "${hook}" not found in HookList.`);
        return null;
      }
    } else {
      // 如果hook已经是函数，直接使用
      actualHookFunction = hook;
    }

    // 将（可能已解析的）函数添加到活动的globalTriggers中
    if (this.globalTriggers[eventType][timing] && actualHookFunction) {
      this.globalTriggers[eventType][timing].push(actualHookFunction);
    }
    
    return actualHookFunction;
  }

  /**
   * 移除全局触发器
   * @param {string} eventType - 要监听的事件类型
   * @param {string} timing - 触发器的时机（before, during, after）
   * @param {Function | string} hook - 要移除的钩子函数或钩子标识符
   */
  removeGlobalTrigger(eventType, timing, hook) {
    if (
      this.globalTriggers[eventType] &&
      this.globalTriggers[eventType][timing]
    ) {
      let saveFlag = true;
      if (hook instanceof Function) saveFlag = false;
      const hookFunction = saveFlag ? HookList[hook] : hook;
      
      this.globalTriggers[eventType][timing] = this.globalTriggers[eventType][
        timing
      ].filter((el) => el !== hookFunction);
      
      if (saveFlag) {
        this.globalSaveTriggers[eventType][timing] = 
          this.globalSaveTriggers[eventType][timing].filter((el) => el !== hook);
      }
    }
  }

  /**
   * 添加临时全局触发器
   * @param {string} eventType - 要监听的事件类型
   * @param {string} timing - 触发器的时机（before, during, after）
   * @param {Function} hook - 要添加的钩子函数
   * @param {number} life - 该触发器允许被触发的次数
   * @returns {string} 触发器的唯一标识符
   */
  addTempGlobalTrigger(eventType, timing, hook, life) {
    if (!this.tempGlobalTriggers[eventType]) {
      this.tempGlobalTriggers[eventType] = {
        before: {},
        during: {},
        after: {},
      };
    }
    
    let symbol;
    if (this.tempGlobalTriggers[eventType][timing]) {
      symbol = this.getNextSymbol();
      this.tempGlobalTriggers[eventType][timing][symbol] = { hook, life };
    }
    
    return symbol;
  }

  /**
   * 执行事件，包括触发所有相关钩子
   * @param {GameEvent} event - 要执行的事件对象
   */
  async executeEvent(event) {
    log("Event:", event);
    this.isEventQueueRunning = true;
    this.currentEvent = event;

    try {
      // 执行事件逻辑
      await event.execute(this);
      
      // 事件完成后处理队列中的下一个事件
      if (this.eventQueue.length > 0) {
        const nextEvent = this.eventQueue.shift();
        await this.executeEvent(nextEvent);
      } else {
        this.isEventQueueRunning = false;
        this.currentEvent = null;
      }
    } catch (error) {
      console.error(`Error executing event ${event.type}:`, error);
      
      // 即使出错也继续处理队列
      if (this.eventQueue.length > 0) {
        const nextEvent = this.eventQueue.shift();
        await this.executeEvent(nextEvent);
      } else {
        this.isEventQueueRunning = false;
        this.currentEvent = null;
      }
      
      throw error;
    }
  }

  /**
   * 获取当前事件队列
   * @returns {Array<GameEvent>} - 当前事件队列的副本
   */
  getEventQueue() {
    return [...this.eventQueue];
  }

  /**
   * 获取当前正在执行的事件
   * @returns {GameEvent | null} - 当前正在执行的事件对象，如果没有则返回null
   */
  getCurrentEvent() {
    return this.currentEvent;
  }

  /**
   * 获取当前正在执行事件的所有父事件
   * @returns {Array<GameEvent>} - 父事件的数组
   */
  getParentEvents() {
    let parents = [];
    let event = this.currentEvent;
    while (event && event.parentEvent) {
      parents.push(event.parentEvent);
      event = event.parentEvent;
    }
    return parents;
  }

  /**
   * 更新游戏时间，每次调用增加游戏内的时间
   * @param {number} minutes - 增加的时间（以分钟为单位）
   */
  updateTime(minutes) {
    if (!this.isTimePaused) {
      this.time += minutes;
      this.triggerTimeUpdate(minutes);
    }
  }

  /**
   * 事件包装器
   * @param {string} eventName - 事件名称
   * @param {Object} options - 事件携带属性
   * @param {Object} callbacks - 事件各阶段回调
   * @param {Array<string>} timings - 事件含有的时机
   * @returns {GameEvent} 创建的事件对象
   */
  eventWrapper(
    eventName = "emptyEvent",
    options = {},
    callbacks = void 0,
    timings = void 0
  ) {
    return new GameEvent(eventName, options, callbacks, timings);
  }

  /**
   * 触发时间更新事件
   * @param {number} minutes - 时间变化值（以分钟为单位）
   */
  triggerTimeUpdate(minutes) {
    const timeUpdateEvent = this.eventWrapper("TimeUpdate", {
      minutes: minutes,
    });
    this.createEvent(timeUpdateEvent);
  }

  /**
   * 暂停游戏内时间的流动
   */
  pauseTime() {
    this.isTimePaused = true;
    if (this.gameTimer) clearInterval(this.gameTimer);
  }

  /**
   * 恢复游戏内时间的流动
   */
  resumeTime() {
    this.isTimePaused = false;
    this.startTimer();
  }

  /**
   * 手动调整游戏时间（仅触发一次TimeUpdate事件）
   * @param {number} minutes - 要调整的时间（以分钟为单位）
   */
  adjustTime(minutes) {
    this.time += minutes;
    this.triggerTimeUpdate(minutes);
  }

  /**
   * 启动游戏时间计时器
   */
  startTimer() {
    this.gameTimer = setInterval(() => {
      this.updateTime();
    }, 60000);
  }
}