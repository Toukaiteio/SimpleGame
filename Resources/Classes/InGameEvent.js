import { GameEvent, EventPriority } from './GameEvent.js';
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
     * @param {string} eventType - 事件类型
     * @param {Object<string, Function>} options - 选项及其回调
     * @param {Function} writer - 文本生成函数
     */
    constructor(eventType, options, writer) {
        super(
            eventType,
            { options, result: null },
            {
                during: async (self, game) => {
                    if (self.state !== 'running') return;
                    await self.handleEventExecution(game);
                }
            }
        );

        this.writer = writer;
        this.choiceButtons = [];
        this.responsePromise = new Promise(resolve => {
            this.resolveResponse = resolve;
        });

        // 设置较长的超时时间，因为需要等待玩家选择
        this.setTimeout(300000); // 5分钟
    }

    /**
     * 处理事件执行
     * @private
     */
    async handleEventExecution(game) {
        const player = getPlayerInstance();
        const ui = getUIInstance();
        const currentScene = ui.getCurrentScene();

        // 检查执行条件
        if (!this.checkExecutionConditions(player, currentScene)) {
            this.cancel();
            return;
        }

        try {
            // 显示事件内容
            this.displayEventContent();

            // 创建并显示选项按钮
            this.createChoiceButtons(game);

            // 等待玩家响应
            const response = await this.responsePromise;
            
            // 清理UI元素
            this.cleanup();

            return response;
        } catch (error) {
            console.error('Error in InGameEvent execution:', error);
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
        this.setupDescriptions();
    }

    /**
     * 设置描述性元素的工具提示
     * @private
     */
    setupDescriptions() {
        const elements = getStoryTellerElement().querySelectorAll('span[hasDescription]');
        
        elements.forEach(element => {
            if (!element.hasTooltip) {
                const title = element.textContent;
                const description = element.getAttribute("data-description") ||
                    i18n.th(element.getAttribute("data-description-at"));
                
                Animations.attachHoverDescription(element, title, description);
                element.hasTooltip = true;
            }
        });
    }

    /**
     * 创建选项按钮
     * @private
     */
    createChoiceButtons(game) {
        const options = {};
        
        // 处理每个选项
        for (const [key, callback] of Object.entries(this.data.options)) {
            options[this.writer(key)] = () => {
                this.handleChoice(game, key, callback);
            };
        }

        // 创建并显示按钮
        this.choiceButtons = UI.createButtons(options);
        getStoryTellerElement().append(...this.choiceButtons);
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
                choiceText: this.writer(choiceKey)
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
                }
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
        this.choiceButtons.forEach(button => button.remove());
        this.choiceButtons = [];
    }

    /**
     * 取消事件
     */
    cancel() {
        this.cleanup();
        super.cancel();
    }
}