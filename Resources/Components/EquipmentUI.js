/**
 * 装备UI组件 - 显示玩家的装备栏
 */
import { EquipmentType } from '../Classes/ItemSystem.js';

export class EquipmentUI {
    constructor(equipment, itemSystemManager, options = {}) {
        this.equipment = equipment;
        this.itemSystemManager = itemSystemManager;
        this.element = null;
        this.slots = {};
        this.options = {
            slotSize: options.slotSize || 64,
            padding: options.padding || 8,
            showTooltip: options.showTooltip !== undefined ? options.showTooltip : true,
            showContextMenu: options.showContextMenu !== undefined ? options.showContextMenu : true,
            layout: options.layout || 'vertical', // 'vertical' 或 'horizontal'
            ...options
        };
        
        this.createEquipmentElement();
        this.setupEventListeners();
    }

    /**
     * 创建装备元素
     */
    createEquipmentElement() {
        // 创建装备容器
        this.element = document.createElement('div');
        this.element.className = 'equipment-container';
        
        // 设置布局
        if (this.options.layout === 'horizontal') {
            this.element.style.display = 'flex';
            this.element.style.flexDirection = 'row';
            this.element.style.flexWrap = 'wrap';
            this.element.style.gap = `${this.options.padding}px`;
        } else {
            this.element.style.display = 'flex';
            this.element.style.flexDirection = 'column';
            this.element.style.gap = `${this.options.padding}px`;
        }
        
        // 创建装备槽位
        this.createEquipmentSlots();
    }

    /**
     * 创建装备槽位
     */
    createEquipmentSlots() {
        // 定义槽位顺序
        const slotOrder = [
            EquipmentType.HEAD,
            EquipmentType.BODY,
            EquipmentType.HANDS,
            EquipmentType.LEGS,
            EquipmentType.FEET,
            EquipmentType.WEAPON,
            EquipmentType.SHIELD,
            EquipmentType.ACCESSORY
        ];
        
        // 创建槽位
        slotOrder.forEach(slotType => {
            const slotContainer = document.createElement('div');
            slotContainer.className = 'equipment-slot-container';
            
            // 创建槽位标签
            const slotLabel = document.createElement('div');
            slotLabel.className = 'equipment-slot-label';
            slotLabel.textContent = this.equipment.getSlotName(slotType);
            
            // 创建槽位
            const slot = this.createSlotElement(slotType);
            
            // 添加到容器
            slotContainer.appendChild(slotLabel);
            slotContainer.appendChild(slot);
            this.element.appendChild(slotContainer);
            
            // 保存槽位引用
            this.slots[slotType] = slot;
        });
    }

    /**
     * 创建槽位元素
     * @param {string} slotType - 槽位类型
     * @returns {HTMLElement} 槽位元素
     */
    createSlotElement(slotType) {
        const slot = document.createElement('div');
        slot.className = 'equipment-slot';
        slot.dataset.slotType = slotType;
        
        // 设置槽位样式
        slot.style.width = `${this.options.slotSize}px`;
        slot.style.height = `${this.options.slotSize}px`;
        slot.style.position = 'relative';
        
        return slot;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 鼠标悬停显示提示框
        if (this.options.showTooltip) {
            this.element.addEventListener('mousemove', (e) => {
                const slot = e.target.closest('.equipment-slot');
                if (!slot) return;
                
                const slotType = slot.dataset.slotType;
                const item = this.equipment.getEquippedItem(slotType);
                
                if (item) {
                    this.itemSystemManager.showItemTooltip(e.clientX, e.clientY, item);
                } else {
                    this.itemSystemManager.hideItemTooltip();
                }
            });
            
            this.element.addEventListener('mouseleave', () => {
                this.itemSystemManager.hideItemTooltip();
            });
        }
        
        // 右键点击显示操作菜单
        if (this.options.showContextMenu) {
            this.element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                const slot = e.target.closest('.equipment-slot');
                if (!slot) return;
                
                const slotType = slot.dataset.slotType;
                const item = this.equipment.getEquippedItem(slotType);
                
                if (item) {
                    // 创建一个特殊的操作菜单，只有卸下选项
                    this.showUnequipMenu(e.clientX, e.clientY, item, slotType);
                }
            });
        }
        
        // 点击卸下装备
        this.element.addEventListener('click', (e) => {
            const slot = e.target.closest('.equipment-slot');
            if (!slot) return;
            
            const slotType = slot.dataset.slotType;
            const item = this.equipment.getEquippedItem(slotType);
            
            if (item) {
                this.unequipItem(slotType);
            }
        });
    }

    /**
     * 显示卸下菜单
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} item - 物品对象
     * @param {string} slotType - 槽位类型
     */
    showUnequipMenu(x, y, item, slotType) {
        // 使用物品系统管理器的操作菜单，但只显示卸下选项
        // 这里我们可以直接调用卸下方法，简化操作
        this.unequipItem(slotType);
    }

    /**
     * 卸下物品
     * @param {string} slotType - 槽位类型
     */
    unequipItem(slotType) {
        const item = this.equipment.getEquippedItem(slotType);
        if (!item) return;
        
        // 获取玩家对象
        const player = this.itemSystemManager.player;
        if (!player) return;
        
        // 获取背包
        const inventory = this.itemSystemManager.inventory;
        if (!inventory) return;
        
        // 卸下物品
        const unequippedItem = this.equipment.unequipItem(slotType, player);
        
        if (unequippedItem) {
            // 添加到背包
            const success = inventory.addItem(unequippedItem);
            
            if (!success) {
                // 如果背包已满，重新装备物品
                this.equipment.equipItem(unequippedItem, player);
            } else {
                // 更新UI
                this.updateSlot(slotType);
                
                // 调用回调函数
                if (this.itemSystemManager.onItemUnequipped) {
                    this.itemSystemManager.onItemUnequipped(unequippedItem, slotType);
                }
            }
        }
    }

    /**
     * 更新所有槽位
     */
    updateAllSlots() {
        for (const slotType in this.slots) {
            this.updateSlot(slotType);
        }
    }

    /**
     * 更新指定槽位
     * @param {string} slotType - 槽位类型
     */
    updateSlot(slotType) {
        const slot = this.slots[slotType];
        if (!slot) return;
        
        const item = this.equipment.getEquippedItem(slotType);
        
        // 清空槽位
        slot.innerHTML = '';
        
        if (!item) {
            // 显示空槽位图标
            const emptyIcon = document.createElement('div');
            emptyIcon.className = 'empty-slot-icon';
            emptyIcon.style.backgroundImage = `url(Resources/Images/UI/empty_${slotType}.png)`;
            slot.appendChild(emptyIcon);
            return;
        }
        
        // 创建物品图标
        const iconElement = document.createElement('div');
        iconElement.className = 'item-icon';
        iconElement.style.backgroundImage = `url(Resources/Images/Items/${item.icon})`;
        slot.appendChild(iconElement);
        
        // 添加稀有度边框
        const rarityBorder = document.createElement('div');
        rarityBorder.className = `rarity-border rarity-${item.rarity}`;
        slot.appendChild(rarityBorder);
        
        // 添加强化等级指示器
        if (item.enhanceLevel > 0) {
            const enhanceElement = document.createElement('div');
            enhanceElement.className = 'item-enhance-level';
            enhanceElement.textContent = `+${item.enhanceLevel}`;
            slot.appendChild(enhanceElement);
        }
        
        // 添加耐久度指示器
        if (item.durability !== null && item.maxDurability !== null) {
            const durabilityPercent = (item.durability / item.maxDurability) * 100;
            
            const durabilityElement = document.createElement('div');
            durabilityElement.className = 'item-durability';
            
            const durabilityBar = document.createElement('div');
            durabilityBar.className = 'durability-bar';
            
            const durabilityFill = document.createElement('div');
            durabilityFill.className = 'durability-fill';
            durabilityFill.style.width = `${durabilityPercent}%`;
            
            // 根据耐久度设置颜色
            if (durabilityPercent < 30) {
                durabilityFill.style.backgroundColor = '#f44336'; // 红色
            } else if (durabilityPercent < 70) {
                durabilityFill.style.backgroundColor = '#ff9800'; // 橙色
            } else {
                durabilityFill.style.backgroundColor = '#4caf50'; // 绿色
            }
            
            durabilityBar.appendChild(durabilityFill);
            durabilityElement.appendChild(durabilityBar);
            slot.appendChild(durabilityElement);
        }
    }

    /**
     * 将装备UI添加到容器
     * @param {HTMLElement} container - 容器元素
     */
    appendTo(container) {
        if (container) {
            container.appendChild(this.element);
            this.updateAllSlots();
        }
    }

    /**
     * 获取装备UI元素
     * @returns {HTMLElement} 装备UI元素
     */
    getElement() {
        return this.element;
    }
}

export default EquipmentUI;