/**
 * 强化对话框组件 - 显示物品强化界面
 */
import { itemEnhanceSystem } from '../Classes/ItemSystem.js';
import messageManager from '../Classes/MessageManager.js';

export class EnhanceDialog {
    constructor(i18n) {
        this.element = null;
        this.item = null;
        this.player = null;
        this.i18n = i18n;
        this.callbacks = {};
        this.materialCount = 0;
        this.isVisible = false;
        
        this.createDialogElement();
        this.setupEventListeners();
    }

    /**
     * 创建对话框元素
     */
    createDialogElement() {
        this.element = document.createElement('div');
        this.element.className = 'enhance-dialog';
        this.element.style.display = 'none';
        
        // 创建基本结构
        this.element.innerHTML = `
            <button class="close-btn">&times;</button>
            <h2></h2>
            
            <div class="enhance-section">
                <h3></h3>
                <div class="enhance-stats"></div>
            </div>
            
            <div class="enhance-section">
                <h3></h3>
                <div class="enhance-options"></div>
            </div>
            
            <div class="enhance-info">
                <div class="success-rate"></div>
                <div class="enhance-cost"></div>
            </div>
            
            <div class="enhance-actions">
                <button class="enhance-confirm-btn"></button>
            </div>
        `;
        
        document.body.appendChild(this.element);
        
        // 获取元素引用
        this.titleElement = this.element.querySelector('h2');
        this.statsElement = this.element.querySelector('.enhance-stats');
        this.optionsElement = this.element.querySelector('.enhance-options');
        this.successRateElement = this.element.querySelector('.success-rate');
        this.costElement = this.element.querySelector('.enhance-cost');
        this.confirmButton = this.element.querySelector('.enhance-confirm-btn');
        this.closeButton = this.element.querySelector('.close-btn');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 关闭按钮
        this.closeButton.addEventListener('click', () => this.hide());
        
        // 确认按钮
        this.confirmButton.addEventListener('click', () => this.enhance());
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // 点击外部区域关闭
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.element.contains(e.target)) {
                this.hide();
            }
        });
    }

    /**
     * 显示对话框
     * @param {Object} item - 要强化的物品
     * @param {Object} player - 玩家对象
     * @param {Object} callbacks - 回调函数
     */
    show(item, player, callbacks = {}) {
        if (!item || !player) return;
        
        this.item = item;
        this.player = player;
        this.callbacks = callbacks;
        this.materialCount = 0;
        
        // 更新界面
        this.updateUI();
        
        // 显示对话框
        this.element.style.display = 'block';
        this.isVisible = true;
        
        // 居中显示
        this.centerDialog();
    }

    /**
     * 隐藏对话框
     */
    hide() {
        this.element.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * 居中显示对话框
     */
    centerDialog() {
        const box = this.element.getBoundingClientRect();
        const centerX = (window.innerWidth - box.width) / 2;
        const centerY = (window.innerHeight - box.height) / 2;
        
        this.element.style.left = `${Math.max(0, centerX)}px`;
        this.element.style.top = `${Math.max(0, centerY)}px`;
    }

    /**
     * 更新界面
     */
    updateUI() {
        // 更新标题
        this.titleElement.textContent = this.i18n.t('enhance_dialog_title');
        
        // 更新当前属性
        this.updateStats();
        
        // 更新强化选项
        this.updateOptions();
        
        // 更新成功率和消耗
        this.updateInfo();
        
        // 更新确认按钮
        this.confirmButton.textContent = this.i18n.t('action_enhance_confirm');
    }

    /**
     * 更新属性显示
     */
    updateStats() {
        const stats = this.item.stats;
        if (!stats) return;
        
        const statsHtml = Object.entries(stats)
            .map(([stat, value]) => {
                const label = this.i18n.t(`item_status_${stat}`);
                return `
                    <div class="stat-row">
                        <span class="stat-label">${label}</span>
                        <span class="stat-value">${value}</span>
                    </div>
                `;
            })
            .join('');
        
        this.statsElement.innerHTML = `
            <div class="current-stats">
                ${statsHtml}
            </div>
        `;
    }

    /**
     * 更新强化选项
     */
    updateOptions() {
        const cost = itemEnhanceSystem.calculateEnhanceCost(this.item);
        const maxMaterials = cost.materials;
        
        // 创建材料选择按钮
        const optionsHtml = Array.from({ length: maxMaterials }, (_, i) => {
            const count = i + 1;
            const selected = count === this.materialCount ? 'selected' : '';
            return `
                <button class="enhance-option ${selected}" data-count="${count}">
                    ${count} ${count === 1 ? 'material' : 'materials'}
                </button>
            `;
        }).join('');
        
        this.optionsElement.innerHTML = optionsHtml;
        
        // 添加点击事件
        this.optionsElement.querySelectorAll('.enhance-option').forEach(button => {
            button.addEventListener('click', () => {
                this.materialCount = parseInt(button.dataset.count);
                this.updateUI();
            });
        });
    }

    /**
     * 更新成功率和消耗信息
     */
    updateInfo() {
        const cost = itemEnhanceSystem.calculateEnhanceCost(this.item);
        const successRate = itemEnhanceSystem.calculateSuccessRate(this.item, this.materialCount);
        
        // 更新成功率
        this.successRateElement.innerHTML = `
            <div class="success-rate-text">
                Success Rate: ${Math.round(successRate * 100)}%
            </div>
        `;
        
        // 更新消耗
        this.costElement.innerHTML = `
            <div class="enhance-cost-text">
                Cost: ${cost.coins} coins
            </div>
        `;
        
        // 更新确认按钮状态
        const canEnhance = this.player.coins >= cost.coins;
        this.confirmButton.disabled = !canEnhance;
        if (!canEnhance) {
            this.confirmButton.classList.add('disabled');
        } else {
            this.confirmButton.classList.remove('disabled');
        }
    }

    /**
     * 执行强化
     */
    enhance() {
        if (!this.item || !this.player) return;
        
        // 执行强化
        const result = itemEnhanceSystem.enhanceItem(this.item, this.materialCount, this.player);
        
        if (result.success) {
            // 更新界面
            this.updateUI();
            
            // 调用回调函数
            if (this.callbacks.onEnhanceSuccess) {
                this.callbacks.onEnhanceSuccess(this.item, result);
            }
        } else {
            // 调用回调函数
            if (this.callbacks.onEnhanceFail) {
                this.callbacks.onEnhanceFail(this.item, result);
            }
        }
        
        // 隐藏对话框
        this.hide();
    }
}

export default EnhanceDialog;