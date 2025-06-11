/**
 * 背包UI组件 - 显示玩家的物品栏
 */
import { Rarity } from '../Classes/ItemSystem.js';

export class InventoryUI {
    constructor(inventory, itemSystemManager, options = {}) {
        this.inventory = inventory;
        this.itemSystemManager = itemSystemManager;
        this.element = null;
        this.slots = [];
        this.options = {
            columns: options.columns || 5,
            slotSize: options.slotSize || 64,
            padding: options.padding || 4,
            showTooltip: options.showTooltip !== undefined ? options.showTooltip : true,
            showContextMenu: options.showContextMenu !== undefined ? options.showContextMenu : true,
            ...options
        };
        
        this.createInventoryElement();
        this.setupEventListeners();
    }

    /**
     * 创建背包元素
     */
    createInventoryElement() {
        // 创建背包容器
        this.element = document.createElement('div');
        this.element.className = 'inventory-container';
        
        // 设置网格布局
        const { columns, slotSize, padding } = this.options;
        const rows = Math.ceil(this.inventory.size / columns);
        
        this.element.style.display = 'grid';
        this.element.style.gridTemplateColumns = `repeat(${columns}, ${slotSize}px)`;
        this.element.style.gridTemplateRows = `repeat(${rows}, ${slotSize}px)`;
        this.element.style.gap = `${padding}px`;
        
        // 创建槽位
        for (let i = 0; i < this.inventory.size; i++) {
            const slot = this.createSlotElement(i);
            this.element.appendChild(slot);
            this.slots.push(slot);
        }
    }

    /**
     * 创建槽位元素
     * @param {number} index - 槽位索引
     * @returns {HTMLElement} 槽位元素
     */
    createSlotElement(index) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = index;
        
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
                const slot = e.target.closest('.inventory-slot');
                if (!slot) return;
                
                const index = parseInt(slot.dataset.index);
                const item = this.inventory.getItem(index);
                
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
                
                const slot = e.target.closest('.inventory-slot');
                if (!slot) return;
                
                const index = parseInt(slot.dataset.index);
                const item = this.inventory.getItem(index);
                
                if (item) {
                    this.itemSystemManager.showItemActionsMenu(e.clientX, e.clientY, item, index);
                }
            });
        }
        
        // 拖放功能
        this.setupDragAndDrop();
    }

    /**
     * 设置拖放功能
     */
    setupDragAndDrop() {
        let draggedItem = null;
        let draggedIndex = -1;
        
        // 开始拖动
        this.element.addEventListener('dragstart', (e) => {
            const slot = e.target.closest('.inventory-slot');
            if (!slot) return;
            
            draggedIndex = parseInt(slot.dataset.index);
            draggedItem = this.inventory.getItem(draggedIndex);
            
            if (draggedItem) {
                e.dataTransfer.setData('text/plain', draggedIndex);
                e.dataTransfer.effectAllowed = 'move';
            }
        });
        
        // 允许放置
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        // 放置物品
        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const slot = e.target.closest('.inventory-slot');
            if (!slot) return;
            
            const targetIndex = parseInt(slot.dataset.index);
            
            if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                // 交换物品
                this.inventory.swapItems(draggedIndex, targetIndex);
                
                // 更新UI
                this.updateSlot(draggedIndex);
                this.updateSlot(targetIndex);
            }
            
            draggedItem = null;
            draggedIndex = -1;
        });
    }

    /**
     * 更新所有槽位
     */
    updateAllSlots() {
        for (let i = 0; i < this.inventory.size; i++) {
            this.updateSlot(i);
        }
    }

    /**
     * 更新指定槽位
     * @param {number} index - 槽位索引
     */
    updateSlot(index) {
        if (index < 0 || index >= this.slots.length) return;
        
        const slot = this.slots[index];
        const item = this.inventory.getItem(index);
        
        // 清空槽位
        slot.innerHTML = '';
        slot.draggable = false;
        
        if (!item) return;
        
        // 设置拖放
        slot.draggable = true;
        
        // 创建物品图标
        const iconElement = document.createElement('div');
        iconElement.className = 'item-icon';
        iconElement.style.backgroundImage = `url(Resources/Images/Items/${item.icon})`;
        slot.appendChild(iconElement);
        
        // 添加稀有度边框
        const rarityBorder = document.createElement('div');
        rarityBorder.className = `rarity-border rarity-${item.rarity}`;
        slot.appendChild(rarityBorder);
        
        // 如果物品可堆叠且数量大于1，显示数量
        if (item.stackable && item.count > 1) {
            const countElement = document.createElement('div');
            countElement.className = 'item-count';
            countElement.textContent = item.count;
            slot.appendChild(countElement);
        }
        
        // 添加物品状态指示器
        this.addItemStatusIndicators(slot, item);
    }

    /**
     * 添加物品状态指示器
     * @param {HTMLElement} slot - 槽位元素
     * @param {Object} item - 物品对象
     */
    addItemStatusIndicators(slot, item) {
        const statusContainer = document.createElement('div');
        statusContainer.className = 'item-status';
        
        // 检查物品是否已装备
        if (this.itemSystemManager.isItemEquipped(item)) {
            const equippedIndicator = document.createElement('div');
            equippedIndicator.className = 'status-indicator status-equipped';
            equippedIndicator.title = 'Equipped';
            statusContainer.appendChild(equippedIndicator);
        }
        
        // 检查物品是否已强化
        if (item.enhanceLevel > 0) {
            const enhancedIndicator = document.createElement('div');
            enhancedIndicator.className = 'status-indicator status-enhanced';
            enhancedIndicator.title = `+${item.enhanceLevel}`;
            statusContainer.appendChild(enhancedIndicator);
        }
        
        // 检查物品是否已损坏
        if (item.isBroken()) {
            const brokenIndicator = document.createElement('div');
            brokenIndicator.className = 'status-indicator status-broken';
            brokenIndicator.title = 'Broken';
            statusContainer.appendChild(brokenIndicator);
        }
        
        if (statusContainer.children.length > 0) {
            slot.appendChild(statusContainer);
        }
    }

    /**
     * 将背包UI添加到容器
     * @param {HTMLElement} container - 容器元素
     */
    appendTo(container) {
        if (container) {
            container.appendChild(this.element);
            this.updateAllSlots();
        }
    }

    /**
     * 获取背包UI元素
     * @returns {HTMLElement} 背包UI元素
     */
    getElement() {
        return this.element;
    }
}

export default InventoryUI;