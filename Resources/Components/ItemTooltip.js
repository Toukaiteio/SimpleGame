/**
 * 物品提示框组件 - 显示物品的详细信息
 */
import { Rarity } from '../Classes/ItemSystem.js';

export class ItemTooltip {
    constructor(i18n) {
        this.element = null;
        this.item = null;
        this.i18n = i18n;
        this.isVisible = false;
        this.offset = { x: 15, y: 15 }; // 鼠标偏移量
        
        this.createTooltipElement();
    }

    /**
     * 创建提示框元素
     */
    createTooltipElement() {
        this.element = document.createElement('div');
        this.element.className = 'tooltip item-tooltip';
        this.element.style.display = 'none';
        document.body.appendChild(this.element);
    }

    /**
     * 显示提示框
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} item - 物品对象
     */
    show(x, y, item) {
        if (!item) return;
        
        this.item = item;
        
        // 更新提示框内容
        this.updateContent();
        
        // 显示提示框
        this.element.style.display = 'block';
        this.isVisible = true;
        
        // 设置位置
        this.updatePosition(x, y);
    }

    /**
     * 隐藏提示框
     */
    hide() {
        this.element.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * 更新提示框位置
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    updatePosition(x, y) {
        // 获取提示框尺寸
        const box = this.element.getBoundingClientRect();
        const tooltipWidth = box.width;
        const tooltipHeight = box.height;
        
        // 获取视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 计算位置，确保提示框在视口内
        let tooltipX = x + this.offset.x;
        let tooltipY = y + this.offset.y;
        
        // 如果提示框超出右边界，显示在鼠标左侧
        if (tooltipX + tooltipWidth > viewportWidth) {
            tooltipX = x - tooltipWidth - this.offset.x;
        }
        
        // 如果提示框超出下边界，显示在鼠标上方
        if (tooltipY + tooltipHeight > viewportHeight) {
            tooltipY = y - tooltipHeight - this.offset.y;
        }
        
        // 确保不超出左边界和上边界
        tooltipX = Math.max(0, tooltipX);
        tooltipY = Math.max(0, tooltipY);
        
        this.element.style.left = `${tooltipX}px`;
        this.element.style.top = `${tooltipY}px`;
    }

    /**
     * 更新提示框内容
     */
    updateContent() {
        const item = this.item;
        if (!item) return;
        
        // 获取物品稀有度颜色
        const rarityColor = this.getRarityColor(item.rarity);
        
        // 构建HTML内容
        let html = `
            <div class="item-tooltip-title" style="color: ${rarityColor}">
                ${item.name}
            </div>
        `;
        
        // 添加物品类型和装备类型
        html += `<div class="item-tooltip-type">`;
        
        // 物品类型
        const typeKey = `item_type_${item.type}`;
        const typeText = this.i18n.exists(typeKey) ? this.i18n.t(typeKey) : item.type;
        html += typeText;
        
        // 装备类型
        if (item.equipmentType) {
            const slotKey = `equipment_slot_${item.equipmentType}`;
            const slotText = this.i18n.exists(slotKey) ? this.i18n.t(slotKey) : item.equipmentType;
            html += ` - ${slotText}`;
        }
        
        html += `</div>`;
        
        // 添加物品描述
        if (item.description) {
            html += `
                <div class="item-tooltip-description">
                    ${item.description}
                </div>
            `;
        }
        
        // 添加物品属性
        if (item.stats && Object.keys(item.stats).length > 0) {
            html += `<div class="item-tooltip-stats">`;
            
            for (const [stat, value] of Object.entries(item.stats)) {
                const statKey = `item_status_${stat}`;
                const statText = this.i18n.exists(statKey) ? this.i18n.t(statKey) : stat;
                
                html += `
                    <div class="item-tooltip-stat">
                        ${statText}: ${value}
                    </div>
                `;
            }
            
            html += `</div>`;
        }
        
        // 添加耐久度
        if (item.durability !== null && item.maxDurability !== null) {
            const durabilityPercent = (item.durability / item.maxDurability) * 100;
            let durabilityColor = '#4caf50'; // 绿色
            
            if (durabilityPercent < 30) {
                durabilityColor = '#f44336'; // 红色
            } else if (durabilityPercent < 70) {
                durabilityColor = '#ff9800'; // 橙色
            }
            
            html += `
                <div class="item-tooltip-durability">
                    <div class="durability-text">
                        ${this.i18n.t('item_status_durability')}: ${item.durability}/${item.maxDurability}
                    </div>
                    <div class="durability-bar">
                        <div class="durability-fill" style="width: ${durabilityPercent}%; background-color: ${durabilityColor}"></div>
                    </div>
                </div>
            `;
        }
        
        // 添加物品等级和强化等级
        if (item.level || item.enhanceLevel) {
            html += `<div class="item-tooltip-level">`;
            
            if (item.level) {
                html += `
                    <div class="item-level">
                        ${this.i18n.t('item_status_level')}: ${item.level}
                    </div>
                `;
            }
            
            if (item.enhanceLevel) {
                html += `
                    <div class="item-enhance-level">
                        +${item.enhanceLevel}
                    </div>
                `;
            }
            
            html += `</div>`;
        }
        
        // 添加物品价值
        if (item.value) {
            html += `
                <div class="item-tooltip-value">
                    ${item.value} coins
                </div>
            `;
        }
        
        // 更新提示框内容
        this.element.innerHTML = html;
    }

    /**
     * 获取稀有度颜色
     * @param {string} rarity - 稀有度
     * @returns {string} 颜色代码
     */
    getRarityColor(rarity) {
        switch (rarity) {
            case Rarity.COMMON:
                return '#9d9d9d'; // 灰色
            case Rarity.UNCOMMON:
                return '#1eff00'; // 绿色
            case Rarity.RARE:
                return '#0070dd'; // 蓝色
            case Rarity.EPIC:
                return '#a335ee'; // 紫色
            case Rarity.LEGENDARY:
                return '#ff8000'; // 橙色
            default:
                return '#ffffff'; // 白色
        }
    }
}

export default ItemTooltip;