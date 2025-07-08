/**
 * 事件状态枚举
 * @enum {string}
 */
export const EventState = {
  CREATED: "created",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/**
 * 事件优先级枚举
 * @enum {number}
 */
export const EventPriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/**
 * 游戏事件基类
 */
export class GameEvent {
  /**
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   * @param {Object} callbacks - 事件回调
   * @param {Array<string>} timings - 事件时机
   */
  constructor(
    type,
    data = {},
    callbacks = {},
    timings = ["before", "during", "after", "final"],
    timeout = 30000
  ) {
    this.type = type;
    this.data = data;
    this.state = EventState.CREATED;
    this.priority = EventPriority.NORMAL;
    this.allowInsertion = true;
    this.timeout = timeout; // 默认30秒超时
    this.isWaitForever = false;
    // 事件关系
    this.parentEvent = null;
    this.childEvents = [];
    this.deferredEvents = []; // 替代原来的insertQueue，用于存储需要延迟执行的事件

    // 钩子函数
    this.hooks = {};
    this.setupHooks(timings, callbacks);

    // 执行Promise
    this.executionPromise = null;
    this.timeoutTimer = null;
  }

  /**
   * 设置事件优先级
   * @param {EventPriority} priority - 优先级
   */
  setPriority(priority) {
    this.priority = priority;
    return this;
  }

  /**
   * 设置是否允许其他事件插入
   * @param {boolean} allow - 是否允许
   */
  setAllowInsertion(allow) {
    this.allowInsertion = allow;
    return this;
  }

  /**
   * 设置超时时间
   * @param {number} ms - 毫秒数
   */
  setTimeout(ms) {
    this.isWaitForever = false;
    this.timeout = ms;
    return this;
  }
  /**
   * 设置是否等待永远
   * @param {boolean} waitForever - 是否等待永远
   */
  setWaitForever(waitForever) {
    this.isWaitForever = waitForever;
    return this;
  }
  /**
   * 设置钩子函数
   * @private
   */
  setupHooks(timings, callbacks) {
    timings.forEach((timing) => {
      this.hooks[timing] = [];
      if (callbacks && callbacks[timing]) {
        this.addHook(timing, callbacks[timing]);
      }
    });
  }

  /**
   * 添加钩子函数
   * @param {string} timing - 触发时机
   * @param {Function} hook - 钩子函数
   */
  addHook(timing, hook) {
    if (this.hooks[timing]) {
      this.hooks[timing].push(hook);
    }
    return this;
  }

  /**
   * 执行特定时机的所有钩子函数
   * @private
   */
  async executeHooks(timing, game) {
    if (!this.hooks[timing].length) return;

    for (const hook of this.hooks[timing]) {
      try {
        await hook(this, game);
      } catch (error) {
        console.error(`Error in ${this.type} event ${timing} hook:`, error);
        throw error;
      }
    }
  }

  /**
   * 执行事件
   * @param {Game} game - 游戏实例
   */
  async execute(game) {
    if (this.state === EventState.CANCELLED) return;

    this.executionPromise = new Promise(async (resolve, reject) => {
      try {
        this.state = EventState.RUNNING;

        // 设置超时处理
        this.timeoutTimer = setTimeout(() => {
          if (this.state === EventState.RUNNING && !this.isWaitForever) {
            this.cancel();
            reject(
              new Error(`Event ${this.type} timed out after ${this.timeout}ms`)
            );
          }
        }, this.timeout);

        // 执行各阶段钩子
        await this.executeHooks("before", game);
        await this.executeHooks("during", game);
        await this.executeHooks("after", game);

        // deferredEvents will now be handled by the Game class after the event is fully completed.

        clearTimeout(this.timeoutTimer);
        this.complete();
        await this.executeHooks("final", game);
        resolve();
      } catch (error) {
        clearTimeout(this.timeoutTimer);
        this.cancel();
        reject(error);
      }
    });

    return this.executionPromise;
  }

  /**
   * 暂停事件
   */
  pause() {
    if (this.state === EventState.RUNNING) {
      this.state = EventState.PAUSED;
    }
    return this;
  }

  /**
   * 恢复事件
   */
  resume() {
    if (this.state === EventState.PAUSED) {
      this.state = EventState.RUNNING;
    }
    return this;
  }

  /**
   * 完成事件
   */
  complete() {
    this.state = EventState.COMPLETED;
    return this;
  }

  /**
   * 取消事件
   */
  cancel() {
    this.state = EventState.CANCELLED;
    clearTimeout(this.timeoutTimer);
    return this;
  }

  /**
   * 添加延迟执行的事件
   * @param {GameEvent} event - 要延迟执行的事件
   */
  defer(event) {
    this.deferredEvents.push(event);
    return this;
  }

  /**
   * 检查事件是否已完成
   */
  isCompleted() {
    return this.state === EventState.COMPLETED;
  }

  /**
   * 检查事件是否已取消
   */
  isCancelled() {
    return this.state === EventState.CANCELLED;
  }
  /**
   * 使GameEvent成为thenable对象，可以被await
   * @param {Function} onFulfilled - 成功回调
   * @param {Function} onRejected - 失败回调
   */
  then(onFulfilled, onRejected) {
    // 如果事件已经完成，直接返回结果
    if (this.isCompleted()) {
      return Promise.resolve(this.data.result).then(onFulfilled, onRejected);
    }

    // 否则创建一个新的Promise，在final阶段完成后resolve
    return new Promise((resolve, reject) => {
      // 确保final钩子执行后触发
      this.hooks.final = this.hooks.final || [];
      this.hooks.final.push(() => {
        if (this.isCompleted()) {
          resolve(this.data.result);
        } else {
          reject(new Error("Event did not complete successfully"));
        }
      });

      // 如果已经有executionPromise，也绑定它的状态
      if (this.executionPromise) {
        this.executionPromise.then(resolve, reject);
      }
    }).then(onFulfilled, onRejected);
  }

  /**
   * 捕获错误
   * @param {Function} onRejected - 失败回调
   */
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }
}
