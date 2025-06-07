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
        buttonWrapper
          .querySelectorAll(".primaryButton")
          .forEach((b) => b.classList.remove("active"));
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

    if (
      choices[defaultIndex]?.onSelect &&
      defaultIndex >= 0 &&
      defaultIndex < choices.length
    ) {
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

  static CheckboxGroup(
    title,
    desc,
    selections,
    defaultIndices = [],
    onChange = () => {}
  ) {
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

    defaultIndices.forEach((i) => {
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

  static RangedSlide(
    title,
    desc,
    min = 0,
    max = 100,
    step = 1,
    defaultVal = 15,
    onChange = () => {}
  ) {
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
    if (defaultVal != null) {
      wrapper.value = defaultVal;
      onChange(wrapper.value);
    }
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  static TextInput(
    title,
    desc,
    label,
    placeholder,
    defaultVal = "",
    onChange = () => {}
  ) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("text-input", "card");
    if (title != null) {
      const titleEl = document.createElement("div");
      titleEl.classList.add("primaryTitle");
      titleEl.textContent = title;
      wrapper.appendChild(titleEl);
    }

    if (desc != null) {
      const descEl = document.createElement("div");
      descEl.classList.add("primaryDesc");
      descEl.textContent = desc;
      wrapper.appendChild(descEl);
    }

    const labelEl = document.createElement("label");
    if (label != null) {
      labelEl.classList.add("primaryLabel");
      labelEl.textContent = label;
    }

    const input = document.createElement("input");
    input.classList.add("primaryInputText");
    input.placeholder = placeholder;
    if (defaultVal != null) {
      input.value = defaultVal;
      onChange(input.value);
    }

    if (label != null) {
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

    items.forEach((item) => appendOption(item));

    if (defaultVal != null) {
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
  static createPlayerInfoDialog(playerInstance, i18nInstance) {
    // Renamed i18n to i18nInstance to avoid conflict
    const dialogOverlay = document.createElement("div");
    dialogOverlay.className = "player-info-dialog-overlay";

    const dialogContent = document.createElement("div");
    dialogContent.className = "player-info-dialog-content";

    const closeButton = document.createElement("button");
    closeButton.textContent = i18nInstance.t("dialog_close_button") || "Close";
    closeButton.onclick = () => dialogOverlay.remove();
    dialogContent.appendChild(closeButton);

    const tabsContainer = document.createElement("div");
    tabsContainer.className = "dialog-tabs";

    const panesContainer = document.createElement("div");
    panesContainer.className = "dialog-panes";

    const tabs = [
      { id: "mergedInventory", label: i18nInstance.t("dialog_tab_inventory") || "Inventory" },
      { id: "attributes", label: i18nInstance.t("dialog_tab_attributes") || "Attributes" },
    ];
    const pannels = {}; // Changed from 'panels' to 'pannels' to match existing typo, will correct later if possible
    tabs.forEach((tabInfo) => {
      const tabButton = document.createElement("button");
      tabButton.textContent = tabInfo.label;
      tabButton.className = "dialog-tab-button";
      tabButton.onclick = () => {
        tabsContainer.querySelectorAll(".dialog-tab-button").forEach((btn) => {
          btn.style.backgroundColor = "transparent"; // Reset style
          btn.classList.remove("active");
        });
        panesContainer
          .querySelectorAll(".dialog-pane")
          .forEach((pane) => (pane.style.display = "none"));
        tabButton.classList.add("active");
        document.getElementById(tabInfo.id + "-pane").style.display = "block";
      };
      tabsContainer.appendChild(tabButton);

      const pane = document.createElement("div");
      pane.id = tabInfo.id + "-pane";
      pane.className = "dialog-pane";
      pane.style.display = "none";
      pannels[tabInfo.id] = { // Changed from 'panels' to 'pannels'
        pane: pane,
        button: tabButton,
      };
      panesContainer.appendChild(pane);
    });

    dialogContent.appendChild(tabsContainer);
    dialogContent.appendChild(panesContainer);
    dialogOverlay.appendChild(dialogContent);

    const refreshDialogData = async () => {
      const mergedInventoryPane = pannels['mergedInventory']['pane'];
      const attributesPane = pannels['attributes']['pane'];

      // 更新 Merged Inventory 面板
      mergedInventoryPane.innerHTML = "";
      const invTitle = document.createElement("h3");
      invTitle.textContent = i18nInstance.t("dialog_tab_inventory") || "Inventory";
      mergedInventoryPane.appendChild(invTitle);

      const coinsDisplay = document.createElement("div");
      coinsDisplay.textContent = `${
        i18nInstance.t("info_status_coin") || "Coins"
      }: ${playerInstance.carrying_coins}`;
      mergedInventoryPane.appendChild(coinsDisplay);

      const playerInventory = playerInstance.inventory;
      for (const itemId in playerInventory) {
        const itemArray = playerInventory[itemId];
        if (itemArray && itemArray.length > 0) {
          // Iterate through each instance of the item if items are not stacked by reference
          for (const item of itemArray) { // Assuming itemArray contains distinct item instances
            if (item.use_time <= 0) continue; // Skip if quantity is zero

            const itemDiv = document.createElement("div");
            itemDiv.className = "inventory-item-row"; // For styling

            let itemDisplayName = `${i18nInstance.t("item_" + item.item_id + "_name") || item.item_name} x ${item.use_time}`;

            let isEquipped = false;
            let equippedSlot = null;
            for (const slot in playerInstance.equipment) {
              if (playerInstance.equipment[slot] === item) {
                isEquipped = true;
                equippedSlot = slot;
                break;
              }
            }

            if (isEquipped) {
              itemDisplayName += ` (${i18nInstance.t("dialog_equipped_label") || "Equipped"})`;
            }
            itemDiv.textContent = itemDisplayName;

            const actionsContainer = document.createElement("div");
            actionsContainer.className = "item-actions";

            if (item.is_equipable) {
              const equipButton = document.createElement("button");
              if (isEquipped) {
                equipButton.textContent = i18nInstance.t("dialog_unequip_button") || "Unequip";
                equipButton.onclick = () => {
                  playerInstance.unwieldItem(item).then(refreshDialogData).catch(console.error);
                };
              } else {
                equipButton.textContent = i18nInstance.t("dialog_equip_button") || "Equip";
                equipButton.onclick = () => {
                  playerInstance.equipItem(item).then(refreshDialogData).catch(console.error);
                };
              }
              actionsContainer.appendChild(equipButton);
            }

            if (item.is_usable) {
              const useButton = document.createElement("button");
              useButton.textContent = i18nInstance.t("dialog_use_button") || "Use";
              useButton.onclick = () => {
                playerInstance.useItem(item).then(refreshDialogData).catch(console.error);
              };
              actionsContainer.appendChild(useButton);
            }

            itemDiv.appendChild(actionsContainer);
            mergedInventoryPane.appendChild(itemDiv);
          }
        }
      }

      // 更新 Attributes 面板
      attributesPane.innerHTML = "";
      const attrTitle = document.createElement("h3");
      attrTitle.textContent =
        i18nInstance.t("dialog_tab_attributes") || "Attributes";
      attributesPane.appendChild(attrTitle);

      const playerStatus = playerInstance.status;
      for (const attrKey in playerStatus) {
        if (
          attrKey === "buffList" ||
          attrKey === "skillPoints" ||
          attrKey.startsWith("max") ||
          !playerStatus.hasOwnProperty(attrKey)
        )
          continue;

        const attrValue = await playerInstance.getNextAttribute(attrKey);
        const attrDiv = document.createElement("div");
        let attrText = `${
          i18nInstance.t("status_" + attrKey) || attrKey
        }: ${attrValue}`;

        const maxAttrKey =
          "max" + attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
        if (playerStatus.hasOwnProperty(maxAttrKey)) {
          attrText += ` / ${await playerInstance.getNextAttribute(maxAttrKey)}`;
        }

        attrDiv.textContent = attrText;
        attributesPane.appendChild(attrDiv);
      }

      const buffsTitle = document.createElement("h4");
      buffsTitle.textContent =
        i18nInstance.t("dialog_buffs_title") || "Active Buffs";
      attributesPane.appendChild(buffsTitle);

      if (playerStatus.buffList && playerStatus.buffList.length > 0) {
        playerStatus.buffList.forEach((buff) => {
          const buffDiv = document.createElement("div");
          buffDiv.textContent = `${
            i18nInstance.t("buff_" + buff.buff + "_name") || buff.buff
          }: ${buff.remainRound} rounds`;
          attributesPane.appendChild(buffDiv);
        });
      } else {
        attributesPane.appendChild(
          document.createTextNode(
            i18nInstance.t("dialog_no_buffs") || "No active buffs."
          )
        );
      }

      // Equipment pane logic is now merged into the mergedInventoryPane

      // 自动激活第一个标签页
      if (
        !tabsContainer.querySelector(".dialog-tab-button.active") &&
        tabsContainer.firstChild
      ) {
        tabsContainer.firstChild.click();
      }
    };

    refreshDialogData();

    dialogOverlay.onclick = (event) => {
      if (event.target === dialogOverlay) {
        dialogOverlay.remove();
      }
    };

    return dialogOverlay;
  }
}
