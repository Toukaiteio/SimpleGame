/**
 * 物品操作菜单组件 - 显示物品的可用操作
 */
import { ItemType } from '../Classes/ItemSystem.js';
import messageManager from '../Classes/MessageManager.js';

export class ItemActionsMenu {
    constructor(i18n) {
        this.element = null;
        this.item = null;
        this.slotIndex = -1;
        this.inventory = null;
        this.equipment = null;
        this.player = null;
        this.i18n = i18n;
        this.callbacks = {};
        this.isVisible = false;
        
        this.createMenuElement();
        this.setupEventListeners();
    }

    /**
     * 创建菜单元素
     */
    createMenuElement() {
        this.element = document.createElement('div');
        this.element.className = 'item-actions-menu';
        this.element.style.display = 'none';
        document.body.appendChild(this.element);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 点击其他区域关闭菜单
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.element.contains(e.target)) {
                this.hide();
            }
        });
        
        // 按ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * 显示菜单
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} item - 物品对象
     * @param {number} slotIndex - 槽位索引
     * @param {Object} inventory - 背包对象
     * @param {Object} equipment - 装备管理器对象
     * @param {Object} player - 玩家对象
     * @param {Object} callbacks - 回调函数
     */
    show(x, y, item, slotIndex, inventory, equipment, player, callbacks = {}) {
        if (!item) return;
        
        this.item = item;
        this.slotIndex = slotIndex;
        this.inventory = inventory;
        this.equipment = equipment;
        this.player = player;
        this.callbacks = callbacks;
        
        // 清空菜单
        this.element.innerHTML = '';
        
        // 根据物品类型添加操作按钮
        this.addActionButtons();
        
        // 设置菜单位置
        this.positionMenu(x, y);
        
        // 显示菜单
        this.element.style.display = 'block';
        this.isVisible = true;
    }

    /**
     * 隐藏菜单
     */
    hide() {
        this.element.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * 设置菜单位置
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    positionMenu(x, y) {
        // 获取菜单尺寸
        const menuWidth = this.element.offsetWidth || 150;
        const menuHeight = this.element.offsetHeight || 200;
        
        // 获取视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 调整位置，确保菜单在视口内
        let menuX = x;
        let menuY = y;
        
        if (menuX + menuWidth > viewportWidth) {
            menuX = viewportWidth - menuWidth - 5;
        }
        
        if (menuY + menuHeight > viewportHeight) {
            menuY = viewportHeight - menuHeight - 5;
        }
        
        this.element.style.left = `${menuX}px`;
        this.element.style.top = `${menuY}px`;
    }

    /**
     * 添加操作按钮
     */
    addActionButtons() {
        const item = this.item;
        
        // 使用按钮
        if (item.isUsable()) {
            this.addButton('action_use', () => this.useItem());
        }
        
        // 装备/卸下按钮
        if (item.isEquipment()) {
            const isEquipped = this.isItemEquipped();
            if (isEquipped) {
                this.addButton('action_unequip', () => this.unequipItem());
            } else {
                this.addButton('action_equip', () => this.equipItem());
            }
        }
        
        // 强化按钮 (仅装备类物品)
        if (item.isEquipment()) {
            this.addButton('action_enhance', () => this.enhanceItem());
        }
        
        // 丢弃按钮
        this.addButton('action_drop', () => this.dropItem());
    }

    /**
     * 添加按钮
     * @param {string} labelKey - 按钮文本的国际化键
     * @param {Function} onClick - 点击回调函数
     */
    addButton(labelKey, onClick) {
        const button = document.createElement('button');
        button.className = 'item-action-button';
        button.textContent = this.i18n.t(labelKey);
        button.addEventListener('click', () => {
            onClick();
            this.hide();
        });
        this.element.appendChild(button);
    }

    /**
     * 使用物品
     */
    useItem() {
        if (!this.item || !this.player) return;
        
        const success = this.item.use(this.player);
        
        if (success) {
            // 如果物品数量为0，从背包中移除
            if (this.item.count <= 0) {
                this.inventory.removeItem(this.slotIndex);
            }
            
            // 调用回调函数
            if (this.callbacks.onItemUsed) {
                this.callbacks.onItemUsed(this.item, this.slotIndex);
            }
        }
    }

    /**
     * 装备物品
     */
    equipItem() {
        if (!this.item || !this.equipment || !this.player) return;
        
        // 从背包中移除物品
        const item = this.inventory.removeItem(this.slotIndex);
        
        if (item) {
            // 装备物品，可能返回被替换的物品
            const oldItem = this.equipment.equipItem(item, this.player);
            
            // 如果有被替换的物品，添加到背包
            if (oldItem) {
                this.inventory.addItem(oldItem);
            }
            
            // 调用回调函数
            if (this.callbacks.onItemEquipped) {
                this.callbacks.onItemEquipped(item, oldItem);
            }
        }
    }

    /**
     * 卸下物品
     */
    unequipItem() {
        if (!this.item || !this.equipment || !this.player) return;
        
        // 获取物品的装备类型
        const slotType = this.item.equipmentType;
        
        // 卸下物品
        const item = this.equipment.unequipItem(slotType, this.player);
        
        if (item) {
            // 添加到背包
            const success = this.inventory.addItem(item);
            
            if (!success) {
                // 如果背包已满，重新装备物品
                this.equipment.equipItem(item, this.player);
                messageManager.error('message_inventory_full');
            } else {
                // 调用回调函数
                if (this.callbacks.onItemUnequipped) {
                    this.callbacks.onItemUnequipped(item, slotType);
                }
            }
        }
    }

    /**
     * 强化物品
     */
    enhanceItem() {
        if (!this.item || !this.player) return;
        
        // 调用回调函数
        if (this.callbacks.onItemEnhance) {
            this.callbacks.onItemEnhance(this.item, this.slotIndex);
        }
    }

    /**
     * 丢弃物品
     */
    dropItem() {
        if (!this.item) return;
        
        // 从背包中移除物品
        const item = this.inventory.removeItem(this.slotIndex);
        
        if (item) {
            messageManager.info('message_item_dropped', [item.name]);
            
            // 调用回调函数
            if (this.callbacks.onItemDropped) {
                this.callbacks.onItemDropped(item, this.slotIndex);
            }
        }
    }

    /**
     * 检查物品是否已装备
     * @returns {boolean} 是否已装备
     */
    isItemEquipped() {
        if (!this.item || !this.item.isEquipment() || !this.equipment) {
            return false;
        }
        
        const slotType = this.item.equipmentType;
        const equippedItem = this.equipment.getEquippedItem(slotType);
        
        return equippedItem && equippedItem.id === this.item.id;
    }
}

export default ItemActionsMenu;