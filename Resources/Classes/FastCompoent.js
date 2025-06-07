import { i18n } from "./I18n.js"; // Added for the new dialog method

export class FastComponent {
  /**
   * 创建一个按钮样式的单选框组
   * @param {string} title 标题
   * @param {Array<{content: string, onSelect: function(FastComponent): void, onCancel: function(FastComponent): void}>} choices 选项数组
   * @param {number} [defaultIndex=0] 默认选中项索引
   * @param {function(number): void} [onChange] 选中变化回调，返回所选索引
   * @returns {HTMLElement} 包含RadioGroup的DOM元素，可通过.value获取当前选中索引，未选中返回-1
   */
  static RadioGroup(title, choices, defaultIndex = 0, onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("radio-group", "card");
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.display = "flex";
    buttonWrapper.style.flexWrap = "wrap";
    buttonWrapper.style.gap = "8px";
    buttonWrapper.style.width = "100%";
    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    let selected = defaultIndex;

    const buttonsFragment = document.createDocumentFragment();
    const buttons = choices.map((choice, i) => {
      const btn = document.createElement("button");
      btn.classList.add("primaryButton");
      btn.textContent = choice.content;
      if (i === defaultIndex) btn.classList.add("active");

      btn.addEventListener("click", () => {
        buttonWrapper.querySelectorAll('.primaryButton').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (selected !== i) {
          if (choices[selected]?.onCancel) choices[selected].onCancel(wrapper);
          if (choice.onSelect) choice.onSelect(wrapper);
          selected = i;
          wrapper.value = selected;
          onChange(i);
        }
      });
      buttonsFragment.appendChild(btn);
      return btn;
    });
    
    if (choices[defaultIndex]?.onSelect && defaultIndex >= 0 && defaultIndex < choices.length) {
      choices[defaultIndex].onSelect(wrapper);
    }
    
    onChange(selected);

    buttonWrapper.appendChild(buttonsFragment);
    wrapper.appendChild(buttonWrapper);
    wrapper.value = selected;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  static CheckboxGroup(title, desc, selections, defaultIndices = [], onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("checkbox-group", "card");
    wrapper.style.display = "flex";
    wrapper.style.flexWrap = "wrap";
    wrapper.style.justifyContent = "space-around";

    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.classList.add("primaryDesc");
    descEl.textContent = desc;
    wrapper.appendChild(descEl);

    const selected = new Set(defaultIndices);

    const buttonsFragment = document.createDocumentFragment();
    selections.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.classList.add("primaryButton");
      btn.textContent = choice.content;
      
      btn.addEventListener("click", () => {
        if (selected.has(i)) {
          selected.delete(i);
          btn.classList.remove("active");
          choice.onCancel?.(wrapper);
        } else {
          selected.add(i);
          btn.classList.add("active");
          choice.onSelect?.(wrapper);
        }
        wrapper.value = [...selected];
        onChange([...selected]);
      });
      if (selected.has(i)) {
         btn.classList.add("active");
      }
      buttonsFragment.appendChild(btn);
    });

    wrapper.appendChild(buttonsFragment);
    onChange([...selected]);
    
    defaultIndices.forEach(i => {
      if (selections[i]?.onSelect) {
        selections[i].onSelect(wrapper);
      }
    });

    wrapper.value = [...selected];
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  static RangedSlide(title, desc, min = 0, max = 100, step = 1, defaultVal = 15, onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("card");
    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.classList.add("primaryDesc");
    descEl.textContent = desc;
    wrapper.appendChild(descEl);

    const input = document.createElement("input");
    input.type = "range";
    input.classList.add("primaryRange");
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = defaultVal;

    const number = document.createElement("input");
    number.type = "number";
    number.classList.add("primaryInputText");
    number.min = min;
    number.max = max;
    number.step = step;
    number.value = defaultVal;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.appendChild(input);
    container.appendChild(number);
    wrapper.appendChild(container);

    function sync(val) {
      input.value = val;
      number.value = val;
      wrapper.value = parseFloat(val);
      onChange(wrapper.value);
    }

    input.addEventListener("input", () => sync(input.value));
    number.addEventListener("input", () => sync(number.value));
    if(defaultVal != null) {
      wrapper.value = defaultVal;
      onChange(wrapper.value);
    }
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  static TextInput(title, desc, label, placeholder, defaultVal = "", onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("text-input", "card");
    if(title != null) {
      const titleEl = document.createElement("div");
      titleEl.classList.add("primaryTitle");
      titleEl.textContent = title;
      wrapper.appendChild(titleEl);
    }
    
    if(desc != null) {
      const descEl = document.createElement("div");
      descEl.classList.add("primaryDesc");
      descEl.textContent = desc;
      wrapper.appendChild(descEl);
    }

    const labelEl = document.createElement("label");
    if(label != null) {
      labelEl.classList.add("primaryLabel");
      labelEl.textContent = label;
    }
    
    const input = document.createElement("input");
    input.classList.add("primaryInputText");
    input.placeholder = placeholder;
    if(defaultVal != null) {
      input.value = defaultVal;
      onChange(input.value);
    }

    if(label != null) {
      labelEl.appendChild(input);
      wrapper.appendChild(labelEl);
    } else {
      wrapper.appendChild(input);
    }
    
    input.addEventListener("input", () => {
      wrapper.value = input.value;
      onChange(input.value);
    });

    wrapper.value = defaultVal;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  static DropMenu(title, desc, items, defaultVal = "", onChange = () => {}) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("card");
    const titleEl = document.createElement("div");
    titleEl.classList.add("primaryTitle");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.classList.add("primaryDesc");
    descEl.textContent = desc;
    wrapper.appendChild(descEl);

    const select = document.createElement("select");
    select.classList.add("primaryInputText");

    function appendOption(item, depth = 0) {
      const option = document.createElement("option");
      option.textContent = "—".repeat(depth) + item.content;
      option.value = item.value;
      select.appendChild(option);
      if (item.sub) appendOption(item.sub, depth + 1);
    }

    items.forEach(item => appendOption(item));

    if(defaultVal != null) {
      select.value = defaultVal;
      onChange(select.value);
    }
    
    select.addEventListener("change", () => {
      wrapper.value = select.value;
      onChange(wrapper.value);
    });

    wrapper.value = defaultVal;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    wrapper.appendChild(select);
    return wrapper;
  }

  // New Static Method
  static createPlayerInfoDialog(playerInstance, i18nInstance) { // Renamed i18n to i18nInstance to avoid conflict
      const dialogOverlay = document.createElement('div');
      dialogOverlay.className = 'player-info-dialog-overlay';
      dialogOverlay.style.position = 'fixed';
      dialogOverlay.style.top = '0';
      dialogOverlay.style.left = '0';
      dialogOverlay.style.width = '100%';
      dialogOverlay.style.height = '100%';
      dialogOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      dialogOverlay.style.display = 'flex';
      dialogOverlay.style.justifyContent = 'center';
      dialogOverlay.style.alignItems = 'center';
      dialogOverlay.style.zIndex = '1000';

      const dialogContent = document.createElement('div');
      dialogContent.className = 'player-info-dialog-content';
      dialogContent.style.backgroundColor = 'var(--background-color, white)';
      dialogContent.style.padding = '20px';
      dialogContent.style.borderRadius = '8px';
      dialogContent.style.minWidth = '300px';
      dialogContent.style.maxWidth = '80%';
      dialogContent.style.maxHeight = '80%';
      dialogContent.style.overflowY = 'auto';
      dialogContent.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      dialogContent.style.position = 'relative'; // For absolute positioning of close button

      const closeButton = document.createElement('button');
      closeButton.textContent = i18nInstance.t('dialog_close_button') || 'Close';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '10px';
      closeButton.style.right = '10px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => dialogOverlay.remove();
      dialogContent.appendChild(closeButton);

      const tabsContainer = document.createElement('div');
      tabsContainer.className = 'dialog-tabs';
      tabsContainer.style.marginBottom = '15px';
      tabsContainer.style.borderBottom = '1px solid #ccc';

      const panesContainer = document.createElement('div');
      panesContainer.className = 'dialog-panes';

      const tabs = [
          { id: 'inventory', label: i18nInstance.t('dialog_tab_inventory') || 'Inventory' },
          { id: 'attributes', label: i18nInstance.t('dialog_tab_attributes') || 'Attributes' },
          { id: 'equipment', label: i18nInstance.t('dialog_tab_equipment') || 'Equipment' }
      ];

      tabs.forEach(tabInfo => {
          const tabButton = document.createElement('button');
          tabButton.textContent = tabInfo.label;
          tabButton.className = 'dialog-tab-button';
          tabButton.style.padding = '8px 12px';
          tabButton.style.marginRight = '5px';
          tabButton.style.border = '1px solid transparent';
          tabButton.style.borderBottom = 'none';
          tabButton.style.cursor = 'pointer';
          tabButton.onclick = () => {
              tabsContainer.querySelectorAll('.dialog-tab-button').forEach(btn => {
                btn.style.backgroundColor = 'transparent'; // Reset style
                btn.classList.remove('active');
              });
              panesContainer.querySelectorAll('.dialog-pane').forEach(pane => pane.style.display = 'none');
              tabButton.classList.add('active');
              tabButton.style.backgroundColor = '#eee'; // Active tab style
              document.getElementById(tabInfo.id + '-pane').style.display = 'block';
          };
          tabsContainer.appendChild(tabButton);

          const pane = document.createElement('div');
          pane.id = tabInfo.id + '-pane';
          pane.className = 'dialog-pane';
          pane.style.display = 'none';
          panesContainer.appendChild(pane);
      });

      dialogContent.appendChild(tabsContainer);
      dialogContent.appendChild(panesContainer);
      dialogOverlay.appendChild(dialogContent);

      async function refreshDialogData() {
          const inventoryPane = document.getElementById('inventory-pane');
          inventoryPane.innerHTML = '';
          const invTitle = document.createElement('h3');
          invTitle.textContent = i18nInstance.t('dialog_tab_inventory') || 'Inventory';
          inventoryPane.appendChild(invTitle);
          const coinsDisplay = document.createElement('div');
          coinsDisplay.textContent = `${i18nInstance.t('info_status_coin') || 'Coins'}: ${playerInstance.carrying_coins}`;
          inventoryPane.appendChild(coinsDisplay);
          const playerInventory = playerInstance.inventory;
          for (const itemId in playerInventory) {
              const itemArray = playerInventory[itemId];
              if (itemArray && itemArray.length > 0) {
                  const item = itemArray[0];
                  const itemCount = item.use_time;
                  if (itemCount <= 0) continue;
                  const itemDiv = document.createElement('div');
                  itemDiv.textContent = `${i18nInstance.t('item_' + item.item_id + '_name') || item.item_name} x ${itemCount}`;
                  itemDiv.style.cursor = 'pointer';
                  itemDiv.onclick = () => {
                      let actionPromise;
                      if (item.is_usable) {
                          actionPromise = item.use(playerInstance);
                      } else if (item.is_equipable) {
                          actionPromise = item.equip(playerInstance);
                      }
                      if (actionPromise && typeof actionPromise.then === 'function') {
                        actionPromise.then(() => refreshDialogData());
                      } else { // If not a promise, refresh immediately (though most game actions should be async)
                        refreshDialogData();
                      }
                  };
                  inventoryPane.appendChild(itemDiv);
              }
          }

          const attributesPane = document.getElementById('attributes-pane');
          attributesPane.innerHTML = '';
          const attrTitle = document.createElement('h3');
          attrTitle.textContent = i18nInstance.t('dialog_tab_attributes') || 'Attributes';
          attributesPane.appendChild(attrTitle);
          const playerStatus = playerInstance.status;
          for (const attrKey in playerStatus) {
              if (attrKey === 'buffList' || attrKey === 'skillPoints' || attrKey.startsWith('max') || !playerStatus.hasOwnProperty(attrKey)) continue;
              const attrValue = await playerInstance.getNextAttribute(attrKey);
              const attrDiv = document.createElement('div');
              let attrText = `${i18nInstance.t('status_' + attrKey) || attrKey}: ${attrValue}`;
              const maxAttrKey = 'max' + attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
              if (playerStatus.hasOwnProperty(maxAttrKey)) {
                   attrText += ` / ${await playerInstance.getNextAttribute(maxAttrKey)}`;
              }
              attrDiv.textContent = attrText;
              attributesPane.appendChild(attrDiv);
          }
          const buffsTitle = document.createElement('h4');
          buffsTitle.textContent = i18nInstance.t('dialog_buffs_title') || 'Active Buffs';
          attributesPane.appendChild(buffsTitle);
          if (playerStatus.buffList && playerStatus.buffList.length > 0) {
              playerStatus.buffList.forEach(buff => {
                  const buffDiv = document.createElement('div');
                  buffDiv.textContent = `${i18nInstance.t('buff_' + buff.buff + '_name') || buff.buff}: ${buff.remainRound} rounds`;
                  attributesPane.appendChild(buffDiv);
              });
          } else {
              attributesPane.appendChild(document.createTextNode(i18nInstance.t('dialog_no_buffs') || 'No active buffs.'));
          }

          const equipmentPane = document.getElementById('equipment-pane');
          equipmentPane.innerHTML = '';
          const equipTitle = document.createElement('h3');
          equipTitle.textContent = i18nInstance.t('dialog_tab_equipment') || 'Equipment';
          equipmentPane.appendChild(equipTitle);
          const playerEquipment = playerInstance.equipment;
          let hasEquipment = false;
          for (const slot in playerEquipment) {
              if (playerEquipment[slot]) {
                  hasEquipment = true;
                  const item = playerEquipment[slot];
                  const itemDiv = document.createElement('div');
                  itemDiv.textContent = `${i18nInstance.t('part_' + item.equip_slot) || item.equip_slot}: ${i18nInstance.t('item_' + item.item_id + '_name') || item.item_name}`;
                  itemDiv.style.cursor = 'pointer';
                  itemDiv.onclick = () => {
                      item.unwield(playerInstance).then(() => refreshDialogData());
                  };
                  equipmentPane.appendChild(itemDiv);
              }
          }
           if (!hasEquipment) {
              equipmentPane.appendChild(document.createTextNode(i18nInstance.t('dialog_no_equipment') || 'No equipment.'));
          }

          if (!tabsContainer.querySelector('.dialog-tab-button.active') && tabsContainer.firstChild) {
               (tabsContainer.firstChild as HTMLElement).click();
          }
      }

      refreshDialogData();

      dialogOverlay.onclick = (event) => {
          if (event.target === dialogOverlay) {
              dialogOverlay.remove();
          }
      };

      return dialogOverlay;
  }
}
