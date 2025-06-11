import { i18n } from "./I18n.js";

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

  /**
   * 创建一个通用的对话框
   * @param {Object} options - 对话框配置选项
   * @param {string} options.title - 对话框标题
   * @param {Function} options.onClose - 关闭回调
   * @param {Function} options.onRefresh - 刷新回调
   * @param {Array<{id: string, label: string, content: Function}>} options.tabs - 标签页配置
   * @returns {HTMLElement} 对话框元素
   */
  static createDialog(options) {
    const {
      title = "",
      onClose = () => {},
      onRefresh = () => {},
      tabs = []
    } = options;

    // 创建对话框容器
    const dialogOverlay = document.createElement("div");
    dialogOverlay.className = "dialog-overlay";
    
    const dialogContent = document.createElement("div");
    dialogContent.className = "dialog-content";

    // 创建标题栏
    const titleBar = document.createElement("div");
    titleBar.className = "dialog-title-bar";
    
    const titleText = document.createElement("h2");
    titleText.textContent = title;
    titleBar.appendChild(titleText);
    
    const closeButton = document.createElement("button");
    closeButton.className = "dialog-close-button";
    closeButton.innerHTML = "×";
    closeButton.onclick = () => {
      onClose();
      dialogOverlay.remove();
    };
    titleBar.appendChild(closeButton);
    
    dialogContent.appendChild(titleBar);

    // 创建标签页
    if (tabs.length > 0) {
      const tabsContainer = document.createElement("div");
      tabsContainer.className = "dialog-tabs";

      const panesContainer = document.createElement("div");
      panesContainer.className = "dialog-panes";

      // 存储所有面板的引用，方便刷新
      const panes = {};

      tabs.forEach((tabInfo) => {
        // 创建标签按钮
        const tabButton = document.createElement("button");
        tabButton.textContent = tabInfo.label;
        tabButton.className = "dialog-tab-button";
        
        // 创建面板容器
        const pane = document.createElement("div");
        pane.id = `${tabInfo.id}-pane`;
        pane.className = "dialog-pane";
        pane.style.display = "none";
        
        // 初始化面板内容
        tabInfo.content(pane);
        
        // 存储面板引用
        panes[tabInfo.id] = pane;
        
        // 标签切换事件
        tabButton.onclick = () => {
          // 更新标签状态
          tabsContainer.querySelectorAll(".dialog-tab-button").forEach(btn => {
            btn.classList.remove("active");
          });
          tabButton.classList.add("active");
          
          // 更新面板显示
          panesContainer.querySelectorAll(".dialog-pane").forEach(p => {
            p.style.display = "none";
          });
          pane.style.display = "block";
        };
        
        tabsContainer.appendChild(tabButton);
        panesContainer.appendChild(pane);
      });

      dialogContent.appendChild(tabsContainer);
      dialogContent.appendChild(panesContainer);

      // 默认选中第一个标签
      if (tabsContainer.firstChild) {
        tabsContainer.firstChild.click();
      }

      // 添加刷新方法
      dialogContent.refresh = () => {
        tabs.forEach(tabInfo => {
          if (panes[tabInfo.id]) {
            panes[tabInfo.id].innerHTML = '';
            tabInfo.content(panes[tabInfo.id]);
          }
        });
        onRefresh();
      };
    }

    dialogOverlay.appendChild(dialogContent);

    // 点击遮罩层关闭对话框
    dialogOverlay.onclick = (event) => {
      if (event.target === dialogOverlay) {
        onClose();
        dialogOverlay.remove();
      }
    };

    // 添加键盘事件监听
    const handleKeyPress = (event) => {
      if (event.key === "Escape") {
        onClose();
        dialogOverlay.remove();
      }
    };
    document.addEventListener("keydown", handleKeyPress);

    // 清理事件监听
    dialogOverlay.addEventListener("remove", () => {
      document.removeEventListener("keydown", handleKeyPress);
    });

    return dialogOverlay;
  }
}