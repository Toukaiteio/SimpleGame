/**
 * 物品系统管理器 - 集成物品系统到游戏中
 */
import { itemManager, Inventory, EquipmentManager } from './ItemSystem.js';
import ItemTemplates from '../Config/items.js';
import ItemActionsMenu from '../Components/ItemActionsMenu.js';
import EnhanceDialog from '../Components/EnhanceDialog.js';
import ItemTooltip from '../Components/ItemTooltip.js';
import messageManager from './MessageManager.js';
import errorHandler from './ErrorHandler.js';
import { I18n } from './I18n.js';

export class ItemSystemManager {
    constructor(game) {
        this.game = game;
        this.inventory = null;
        this.equipment = null;
        this.i18n = null;
        this.actionsMenu = null;
        this.enhanceDialog = null;
        this.tooltip = null;
        this.inventoryUI = null;
        this.equipmentUI = null;
        this.player = null;
    }

    /**
     * 初始化物品系统
     * @param {Object} player - 玩家对象
     * @param {Object} options - 初始化选项
     */
    init(player, options = {}) {
        this.player = player;
        
        // 初始化国际化
        this.initI18n();
        
        // 初始化物品管理器
        this.initItemManager();
        
        // 创建背包和装备管理器
        this.inventory = new Inventory(options.inventorySize || 20);
        this.equipment = new EquipmentManager();
        
        // 设置国际化实例
        this.equipment.setI18n(this.i18n);
        messageManager.setI18n(this.i18n);
        errorHandler.setI18n(this.i18n);
        
        // 初始化UI组件
        this.initUIComponents();
        
        // 添加测试物品（仅在开发模式下）
        if (options.debug) {
            this.addTestItems();
        }
        
        console.log('Item system initialized');
    }

    /**
     * 初始化国际化
     */
    initI18n() {
        this.i18n = new I18n();
        this.i18n.init();
    }

    /**
     * 初始化物品管理器
     */
    initItemManager() {
        // 注册物品模板
        itemManager.registerItemTemplates(ItemTemplates);
        
        // 设置国际化实例
        itemManager.setI18n(this.i18n);
    }

    /**
     * 初始化UI组件
     */
    initUIComponents() {
        // 创建物品操作菜单
        this.actionsMenu = new ItemActionsMenu(this.i18n);
        
        // 创建强化对话框
        this.enhanceDialog = new EnhanceDialog(this.i18n);
        
        // 创建物品提示框
        this.tooltip = new ItemTooltip(this.i18n);
    }

    /**
     * 添加测试物品
     */
    addTestItems() {
        // 添加一些测试物品到背包
        const items = [
            'wooden_sword',
            'leather_armor',
            'health_potion',
            'mana_potion',
            'iron_ore',
            'wood'
        ];
        
        items.forEach(templateId => {
            const item = itemManager.createItem(templateId);
            if (item) {
                this.inventory.addItem(item);
            }
        });
    }

    /**
     * 显示物品操作菜单
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} item - 物品对象
     * @param {number} slotIndex - 槽位索引
     */
    showItemActionsMenu(x, y, item, slotIndex) {
        if (!item) return;
        
        this.actionsMenu.show(x, y, item, slotIndex, this.inventory, this.equipment, this.player, {
            onItemUsed: (item, slotIndex) => this.onItemUsed(item, slotIndex),
            onItemEquipped: (item, oldItem) => this.onItemEquipped(item, oldItem),
            onItemUnequipped: (item, slotType) => this.onItemUnequipped(item, slotType),
            onItemEnhance: (item, slotIndex) => this.showEnhanceDialog(item, slotIndex),
            onItemDropped: (item, slotIndex) => this.onItemDropped(item, slotIndex)
        });
    }

    /**
     * 显示强化对话框
     * @param {Object} item - 要强化的物品
     * @param {number} slotIndex - 槽位索引
     */
    showEnhanceDialog(item, slotIndex) {
        if (!item) return;
        
        this.enhanceDialog.show(item, this.player, {
            onEnhanceSuccess: (item, result) => this.onItemEnhanced(item, result, slotIndex),
            onEnhanceFail: (item, result) => this.onEnhanceFailed(item, result, slotIndex)
        });
    }

    /**
     * 显示物品提示框
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} item - 物品对象
     */
    showItemTooltip(x, y, item) {
        if (!item) return;
        
        this.tooltip.show(x, y, item);
    }

    /**
     * 隐藏物品提示框
     */
    hideItemTooltip() {
        this.tooltip.hide();
    }

    /**
     * 物品使用回调
     * @param {Object} item - 使用的物品
     * @param {number} slotIndex - 槽位索引
     */
    onItemUsed(item, slotIndex) {
        // 更新UI
        if (this.inventoryUI) {
            this.inventoryUI.updateSlot(slotIndex);
        }
        
        // 触发游戏事件
        if (this.game && this.game.events) {
            this.game.events.emit('itemUsed', item);
        }
    }

    /**
     * 物品装备回调
     * @param {Object} item - 装备的物品
     * @param {Object} oldItem - 被替换的物品
     */
    onItemEquipped(item, oldItem) {
        // 更新UI
        if (this.equipmentUI) {
            this.equipmentUI.updateSlot(item.equipmentType);
        }
        
        if (this.inventoryUI) {
            this.inventoryUI.updateAllSlots();
        }
        
        // 更新玩家属性
        this.updatePlayerStats();
        
        // 触发游戏事件
        if (this.game && this.game.events) {
            this.game.events.emit('itemEquipped', item);
        }
    }

    /**
     * 物品卸下回调
     * @param {Object} item - 卸下的物品
     * @param {string} slotType - 装备槽位类型
     */
    onItemUnequipped(item, slotType) {
        // 更新UI
        if (this.equipmentUI) {
            this.equipmentUI.updateSlot(slotType);
        }
        
        if (this.inventoryUI) {
            this.inventoryUI.updateAllSlots();
        }
        
        // 更新玩家属性
        this.updatePlayerStats();
        
        // 触发游戏事件
        if (this.game && this.game.events) {
            this.game.events.emit('itemUnequipped', item);
        }
    }

    /**
     * 物品强化成功回调
     * @param {Object} item - 强化的物品
     * @param {Object} result - 强化结果
     * @param {number} slotIndex - 槽位索引
     */
    onItemEnhanced(item, result, slotIndex) {
        // 更新UI
        if (this.inventoryUI) {
            this.inventoryUI.updateSlot(slotIndex);
        }
        
        // 更新玩家属性（如果是装备中的物品）
        if (this.isItemEquipped(item)) {
            this.updatePlayerStats();
        }
        
        // 触发游戏事件
        if (this.game && this.game.events) {
            this.game.events.emit('itemEnhanced', item, result);
        }
    }

    /**
     * 物品强化失败回调
     * @param {Object} item - 强化的物品
     * @param {Object} result - 强化结果
     * @param {number} slotIndex - 槽位索引
     */
    onEnhanceFailed(item, result, slotIndex) {
        // 触发游戏事件
        if (this.game && this.game.events) {
            this.game.events.emit('itemEnhanceFailed', item, result);
        }
    }

    /**
     * 物品丢弃回调
     * @param {Object} item - 丢弃的物品
     * @param {number} slotIndex - 槽位索引
     */
    onItemDropped(item, slotIndex) {
        // 更新UI
        if (this.inventoryUI) {
            this.inventoryUI.updateSlot(slotIndex);
        }
        
        // 触发游戏事件
        if (this.game && this.game.events) {
            this.game.events.emit('itemDropped', item);
        }
    }

    /**
     * 更新玩家属性
     */
    updatePlayerStats() {
        if (!this.player) return;
        
        // 计算装备提供的属性加成
        const equipmentStats = this.equipment.calculateEquipmentStats();
        
        // 更新玩家属性
        if (this.player.updateEquipmentStats) {
            this.player.updateEquipmentStats(equipmentStats);
        }
    }

    /**
     * 检查物品是否已装备
     * @param {Object} item - 物品对象
     * @returns {boolean} 是否已装备
     */
    isItemEquipped(item) {
        if (!item || !item.isEquipment() || !item.equipmentType) {
            return false;
        }
        
        const equippedItem = this.equipment.getEquippedItem(item.equipmentType);
        return equippedItem && equippedItem.id === item.id;
    }

    /**
     * 设置背包UI组件
     * @param {Object} inventoryUI - 背包UI组件
     */
    setInventoryUI(inventoryUI) {
        this.inventoryUI = inventoryUI;
    }

    /**
     * 设置装备UI组件
     * @param {Object} equipmentUI - 装备UI组件
     */
    setEquipmentUI(equipmentUI) {
        this.equipmentUI = equipmentUI;
    }

    /**
     * 保存物品系统数据
     * @returns {Object} 物品系统数据
     */
    saveData() {
        return {
            inventory: this.inventory.toJSON(),
            equipment: this.equipment.toJSON()
        };
    }

    /**
     * 加载物品系统数据
     * @param {Object} data - 物品系统数据
     */
    loadData(data) {
        if (!data) return;
        
        if (data.inventory) {
            this.inventory.fromJSON(data.inventory);
        }
        
        if (data.equipment) {
            this.equipment.fromJSON(data.equipment);
        }
        
        // 更新UI
        if (this.inventoryUI) {
            this.inventoryUI.updateAllSlots();
        }
        
        if (this.equipmentUI) {
            this.equipmentUI.updateAllSlots();
        }
        
        // 更新玩家属性
        this.updatePlayerStats();
    }
}

export default ItemSystemManager;