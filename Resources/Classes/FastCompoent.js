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
        // Need to access buttons array for forEach, so map still needed for the array.
        // Or, querySelectorAll on buttonWrapper if fragment wasn't used for buttons array.
        buttonWrapper.querySelectorAll('.primaryButton').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (selected !== i) {
          if (choices[selected]?.onCancel) choices[selected].onCancel(wrapper);
          if (choice.onSelect) choice.onSelect(wrapper);
          selected = i;
          wrapper.value = selected; // Update wrapper value
          onChange(i);
        }
      });
      // onChange(selected); // Call onChange initially or after loop
      buttonsFragment.appendChild(btn);
      return btn; // Still return btn to potentially build 'buttons' array if needed elsewhere, though direct DOM manipulation is via fragment
    });
    
    // Trigger onSelect for default selection
    if (choices[defaultIndex]?.onSelect && defaultIndex >= 0 && defaultIndex < choices.length) {
      choices[defaultIndex].onSelect(wrapper);
    }
    
    onChange(selected); // Initial call

    buttonWrapper.appendChild(buttonsFragment);
    wrapper.appendChild(buttonWrapper);
    wrapper.value = selected; // Ensure wrapper.value is set initially
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  /**
   * 创建一个按钮样式的多选框组
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {Array<{content: string, onSelect: function(FastComponent): void, onCancel: function(FastComponent): void}>} selections 选项数组
   * @param {Array<number>} [defaultIndices=[]] 默认选中项索引数组
   * @param {function(Array<number>): void} [onChange] 选中变化回调，返回所选索引数组
   * @returns {HTMLElement} 包含CheckboxGroup的DOM元素，可通过.value获取当前选中索引数组
   */
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
    const buttons = selections.map((choice, i) => {
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
        wrapper.value = [...selected]; // Update wrapper value
        onChange([...selected]);
      });
      if (selected.has(i)) {
        // Simulate click after element is in DOM or ensure active class is set
         btn.classList.add("active"); // Set active class directly
      }
      buttonsFragment.appendChild(btn);
      return btn; // Still return btn if array needed
    });

    wrapper.appendChild(buttonsFragment);
    // Initial onChange call after all buttons potentially processed by `btn.click()` or class set
    onChange([...selected]);
    
    // Trigger onSelect for default selections
    defaultIndices.forEach(i => {
      if (selections[i]?.onSelect) {
        selections[i].onSelect(wrapper);
      }
    });

    wrapper.value = [...selected]; // Ensure wrapper.value is set initially
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    return wrapper;
  }

  /**
   * 创建一个滑动条和输入框联动组件
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @param {number} step 步长
   * @param {number} defaultVal 默认值
   * @param {function(number): void} [onChange] 值变化回调
   * @returns {HTMLElement} DOM元素，可通过.value获取当前值
   */
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

  /**
   * 创建一个带标签的文本输入框
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {string} label 输入框标签
   * @param {string} placeholder 占位符
   * @param {string} [defaultVal=""] 默认值
   * @param {function(string): void} [onChange] 值变化回调
   * @returns {HTMLElement} DOM元素，可通过.value获取当前输入内容
   */
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

  /**
   * 创建一个下拉菜单（支持嵌套）
   * @param {string} title 标题
   * @param {string} desc 描述
   * @param {Array<{content: string, value: any, sub: object|null}>} items 下拉项数组
   * @param {any} [defaultVal=""] 默认值
   * @param {function(any): void} [onChange] 值变化回调
   * @returns {HTMLElement} DOM元素，可通过.value获取当前选中值
   */
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
}
