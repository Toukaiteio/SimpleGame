/**
 * 错误处理工具类 - 用于处理游戏中的各种错误
 */
import messageManager from './MessageManager.js';

class ErrorHandler {
    constructor() {
        this.i18n = null;
        this.logger = console;
        this.errorCodes = {
            // 系统错误
            SYSTEM_ERROR: 1000,
            NETWORK_ERROR: 1001,
            RESOURCE_LOAD_ERROR: 1002,
            
            // 游戏逻辑错误
            GAME_LOGIC_ERROR: 2000,
            SAVE_LOAD_ERROR: 2001,
            
            // 物品系统错误
            INVENTORY_FULL: 3000,
            ITEM_NOT_FOUND: 3001,
            CANNOT_EQUIP_ITEM: 3002,
            CANNOT_USE_ITEM: 3003,
            ITEM_BROKEN: 3004,
            ENHANCE_FAILED: 3005,
            NOT_ENOUGH_MATERIALS: 3006,
            NOT_ENOUGH_COINS: 3007,
            
            // 用户输入错误
            INVALID_INPUT: 4000,
            INVALID_OPERATION: 4001
        };
    }

    /**
     * 设置国际化实例
     * @param {Object} i18nInstance - I18n实例
     */
    setI18n(i18nInstance) {
        this.i18n = i18nInstance;
        messageManager.setI18n(i18nInstance);
    }

    /**
     * 设置自定义日志记录器
     * @param {Object} logger - 日志记录器对象
     */
    setLogger(logger) {
        if (logger && typeof logger.error === 'function') {
            this.logger = logger;
        }
    }

    /**
     * 处理错误
     * @param {number|Error} error - 错误代码或Error对象
     * @param {string} message - 错误消息或国际化键
     * @param {Array} params - 国际化参数
     * @param {boolean} showToUser - 是否向用户显示错误消息
     * @returns {boolean} - 是否成功处理错误
     */
    handleError(error, message = '', params = [], showToUser = true) {
        let errorCode = 0;
        let errorMessage = message;
        
        // 处理不同类型的错误
        if (error instanceof Error) {
            errorCode = this.errorCodes.SYSTEM_ERROR;
            errorMessage = error.message || message;
            this.logger.error('[Error]', error);
        } else if (typeof error === 'number') {
            errorCode = error;
            // 如果没有提供消息，尝试根据错误代码获取默认消息
            if (!message) {
                errorMessage = this.getDefaultErrorMessage(errorCode);
            }
        } else {
            errorCode = this.errorCodes.SYSTEM_ERROR;
            errorMessage = String(error) || message;
        }
        
        // 记录错误
        this.logger.error(`[Error ${errorCode}]`, errorMessage);
        
        // 显示给用户
        if (showToUser) {
            messageManager.error(errorMessage, params);
        }
        
        return true;
    }

    /**
     * 获取默认错误消息
     * @param {number} errorCode - 错误代码
     * @returns {string} - 错误消息
     */
    getDefaultErrorMessage(errorCode) {
        // 根据错误代码返回对应的国际化键
        switch (errorCode) {
            case this.errorCodes.INVENTORY_FULL:
                return 'message_inventory_full';
            case this.errorCodes.ITEM_NOT_FOUND:
                return 'message_item_not_found';
            case this.errorCodes.CANNOT_EQUIP_ITEM:
                return 'message_cannot_equip';
            case this.errorCodes.CANNOT_USE_ITEM:
                return 'message_cannot_use';
            case this.errorCodes.ITEM_BROKEN:
                return 'message_item_broken';
            case this.errorCodes.ENHANCE_FAILED:
                return 'enhance_failed';
            case this.errorCodes.NOT_ENOUGH_MATERIALS:
                return 'enhance_not_enough_materials';
            case this.errorCodes.NOT_ENOUGH_COINS:
                return 'enhance_not_enough_coins';
            default:
                return 'An error occurred';
        }
    }

    /**
     * 处理物品相关错误
     * @param {number} errorCode - 错误代码
     * @param {Object} item - 物品对象
     * @returns {boolean} - 是否成功处理错误
     */
    handleItemError(errorCode, item = null) {
        const params = item ? [item.name] : [];
        return this.handleError(errorCode, '', params, true);
    }

    /**
     * 处理系统错误
     * @param {Error} error - 错误对象
     * @param {boolean} showToUser - 是否向用户显示错误消息
     * @returns {boolean} - 是否成功处理错误
     */
    handleSystemError(error, showToUser = false) {
        return this.handleError(error, '', [], showToUser);
    }
}

// 导出单例实例
export const errorHandler = new ErrorHandler();
export default errorHandler;