/**
 * 消息管理器类 - 用于显示各种类型的消息提示
 */
class MessageManager {
    constructor() {
        this.container = null;
        this.messageQueue = [];
        this.isProcessing = false;
        this.i18n = null;
        this.initContainer();
    }

    /**
     * 初始化消息容器
     */
    initContainer() {
        // 检查是否已存在容器
        if (document.querySelector('.message-container')) {
            this.container = document.querySelector('.message-container');
            return;
        }

        // 创建消息容器
        this.container = document.createElement('div');
        this.container.className = 'message-container';
        document.body.appendChild(this.container);
    }

    /**
     * 设置国际化实例
     * @param {Object} i18nInstance - I18n实例
     */
    setI18n(i18nInstance) {
        this.i18n = i18nInstance;
    }

    /**
     * 显示成功消息
     * @param {string} message - 消息内容或国际化键
     * @param {Array} params - 国际化参数
     * @param {number} duration - 显示时长(毫秒)
     */
    success(message, params = [], duration = 3000) {
        this.showMessage(message, 'success', params, duration);
    }

    /**
     * 显示错误消息
     * @param {string} message - 消息内容或国际化键
     * @param {Array} params - 国际化参数
     * @param {number} duration - 显示时长(毫秒)
     */
    error(message, params = [], duration = 3000) {
        this.showMessage(message, 'error', params, duration);
    }

    /**
     * 显示信息消息
     * @param {string} message - 消息内容或国际化键
     * @param {Array} params - 国际化参数
     * @param {number} duration - 显示时长(毫秒)
     */
    info(message, params = [], duration = 3000) {
        this.showMessage(message, 'info', params, duration);
    }

    /**
     * 显示警告消息
     * @param {string} message - 消息内容或国际化键
     * @param {Array} params - 国际化参数
     * @param {number} duration - 显示时长(毫秒)
     */
    warning(message, params = [], duration = 3000) {
        this.showMessage(message, 'warning', params, duration);
    }

    /**
     * 显示消息
     * @param {string} message - 消息内容或国际化键
     * @param {string} type - 消息类型
     * @param {Array} params - 国际化参数
     * @param {number} duration - 显示时长(毫秒)
     */
    showMessage(message, type = 'info', params = [], duration = 3000) {
        // 添加到队列
        this.messageQueue.push({
            message,
            type,
            params,
            duration
        });

        // 如果没有正在处理的消息，开始处理
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * 处理消息队列
     */
    processQueue() {
        if (this.messageQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { message, type, params, duration } = this.messageQueue.shift();
        
        // 创建消息元素
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        
        // 处理国际化
        let displayMessage = message;
        if (this.i18n && this.i18n.exists(message)) {
            displayMessage = this.i18n.t(message, ...params);
        } else if (params.length > 0) {
            // 如果没有国际化但有参数，尝试简单替换 %s
            displayMessage = message.replace(/%s/g, (match, index) => {
                return params[index] !== undefined ? params[index] : match;
            });
        }
        
        messageElement.textContent = displayMessage;
        
        // 添加到容器
        this.container.appendChild(messageElement);
        
        // 设置自动移除
        setTimeout(() => {
            // 添加淡出动画结束监听
            messageElement.addEventListener('animationend', (e) => {
                if (e.animationName.includes('fade-out')) {
                    this.container.removeChild(messageElement);
                    // 处理下一条消息
                    setTimeout(() => this.processQueue(), 100);
                }
            });
            
            // 触发淡出动画
            messageElement.style.animation = 'message-fade-out 0.3s ease-out forwards';
        }, duration);
    }
}

// 导出单例实例
export const messageManager = new MessageManager();
export default messageManager;