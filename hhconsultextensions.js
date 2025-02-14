export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_dropdown" || trace.payload?.name === "ext_dropdown",
  render: ({ trace, element }) => {
    const disableFooterInputs = (isDisabled) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = isDisabled;
            el.style.pointerEvents = isDisabled ? "none" : "auto";
            el.style.opacity = isDisabled ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = isDisabled ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    const formContainer = document.createElement("form");
    formContainer.className = "_1ddzqsn7";
    const dropdownOptions = trace.payload?.options || [];

    formContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
      
      ._1ddzqsn7 {
        display: block;
      }
      
      .dropdown-wrapper {
        width: 100%;
        font-family: 'Montserrat', sans-serif;
      }
      
      .dropdown-extension-container {
        position: relative;
        width: 100%;
        margin-bottom: 8px;
      }
      
      .dropdown-extension-input[type="text"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid rgba(84, 88, 87, 0.2);
        border-radius: 6px;
        background: white;
        color: #545857;
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        transition: all 0.2s ease;
        cursor: pointer;
        margin: 0;
      }

      .dropdown-extension-input[type="text"]:focus {
        outline: none;
        border-color: #545857;
        box-shadow: 0 0 0 2px rgba(84, 88, 87, 0.1);
      }

      .dropdown-extension-input[type="text"]::placeholder {
        color: #72727a;
        opacity: 0.7;
      }

      .dropdown-extension-input[type="text"]:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
        opacity: 0.7;
      }

      .dropdown-extension-options {
        position: absolute;
        bottom: calc(100% + 4px);
        left: 0;
        right: 0;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border-radius: 6px;
        border: 1px solid rgba(84, 88, 87, 0.15);
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
        display: none;
        z-index: 1000;
        scrollbar-width: thin;
        scrollbar-color: #72727a transparent;
      }

      .dropdown-extension-options div {
        padding: 8px 12px;
        font-size: 13px;
        color: #545857;
        cursor: pointer;
        transition: background-color 0.2s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dropdown-extension-options div:hover,
      .dropdown-extension-options div.highlighted {
        background-color: rgba(84, 88, 87, 0.08);
      }

      .dropdown-extension-submit {
        width: 100%;
        padding: 8px 16px;
        background-color: #545857;
        color: white;
        border: none;
        border-radius: 6px;
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        opacity: 0.5;
        pointer-events: none;
        transition: all 0.2s ease;
        margin: 0;
      }

      .dropdown-extension-submit.enabled {
        opacity: 1;
        pointer-events: auto;
      }

      .dropdown-extension-submit.enabled:hover {
        background-color: #72727a;
      }

      .dropdown-extension-invalid {
        border-color: #ff4444 !important;
      }

      .dropdown-extension-input[type="text"] {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23545857' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }
    </style>
  
    <div class="dropdown-wrapper">
      <div class="dropdown-extension-container">
        <input 
          type="text" 
          class="dropdown-extension-input dropdown-extension-search" 
          placeholder="Search or select..." 
          autocomplete="off"
          spellcheck="false"
        >
        <div class="dropdown-extension-options">
          ${dropdownOptions
            .map((option) => `<div data-value="${option}">${option}</div>`)
            .join("")}
        </div>
        <input 
          type="hidden" 
          class="dropdown-extension-input dropdown-extension-hidden" 
          name="dropdown" 
          required
        >
      </div>
      <button type="submit" class="dropdown-extension-submit">Submit</button>
    </div>
  `;  

    const dropdownSearch = formContainer.querySelector(".dropdown-extension-search");
    const dropdownOptionsDiv = formContainer.querySelector(".dropdown-extension-options");
    const hiddenDropdownInput = formContainer.querySelector(".dropdown-extension-hidden");
    const submitButton = formContainer.querySelector(".dropdown-extension-submit");
    let highlightedIndex = -1;

    const enableSubmitButton = () => {
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      submitButton.classList.toggle("enabled", isValidOption);
    };

    const showDropup = (e) => {
      if (e) e.stopPropagation();
      dropdownOptionsDiv.style.display = "block";
    };

    const hideDropup = () => {
      dropdownOptionsDiv.style.display = "none";
      highlightedIndex = -1;
      updateHighlight();
    };

    const updateHighlight = () => {
      const options = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
      options.forEach((option, index) => {
        option.classList.toggle("highlighted", index === highlightedIndex);
      });
    };

    const handleOptionSelection = (selectedValue) => {
      dropdownSearch.value = selectedValue;
      hiddenDropdownInput.value = selectedValue;
      hideDropup();
      enableSubmitButton();
    };

    const handleInput = (e) => {
      e.stopPropagation();
      const filter = dropdownSearch.value.toLowerCase();
      const options = dropdownOptionsDiv.querySelectorAll("div");
      
      options.forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(filter) ? "" : "none";
      });
      
      showDropup();
      hiddenDropdownInput.value = "";
      enableSubmitButton();
      highlightedIndex = -1;
      updateHighlight();
    };

    const handleKeyNavigation = (e) => {
      const visibleOptions = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
      
      switch(e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!dropdownOptionsDiv.style.display === "block") {
            showDropup();
          } else {
            highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
            updateHighlight();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (highlightedIndex > -1) {
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight();
          }
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
            const selectedValue = visibleOptions[highlightedIndex].getAttribute("data-value");
            handleOptionSelection(selectedValue);
          }
          break;
        case "Escape":
          hideDropup();
          dropdownSearch.blur();
          break;
      }
    };

    // Add event listeners
    dropdownSearch.addEventListener("focus", showDropup);
    dropdownSearch.addEventListener("click", showDropup);
    dropdownSearch.addEventListener("input", handleInput);
    dropdownSearch.addEventListener("keydown", handleKeyNavigation);

    dropdownOptionsDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.tagName === "DIV") {
        const selectedValue = e.target.getAttribute("data-value");
        handleOptionSelection(selectedValue);
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdownSearch.contains(e.target) && !dropdownOptionsDiv.contains(e.target)) {
        hideDropup();
      }
    });

    formContainer.addEventListener("submit", (e) => {
      e.preventDefault();
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      if (!isValidOption) {
        dropdownSearch.classList.add("dropdown-extension-invalid");
        return;
      }

      // Disable input and prevent changes after submission
      dropdownSearch.disabled = true;
      dropdownSearch.style.backgroundColor = "#f5f5f5";
      dropdownSearch.style.cursor = "not-allowed";
      dropdownSearch.style.opacity = "0.7";
      
      // Remove all event listeners to prevent any interaction
      dropdownSearch.removeEventListener("focus", showDropup);
      dropdownSearch.removeEventListener("click", showDropup);
      dropdownSearch.removeEventListener("input", handleInput);
      dropdownSearch.removeEventListener("keydown", handleKeyNavigation);
      
      // Disable submit button
      submitButton.disabled = true;
      
      // Re-enable Voiceflow's footer first
      disableFooterInputs(false);
      
      // Remove submit button with a slight delay
      setTimeout(() => {
        submitButton.style.opacity = "0";
        submitButton.remove();
      }, 50);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: { dropdown: hiddenDropdownInput.value },
      });
    });

    const cleanup = () => {
      document.removeEventListener("click", hideDropup);
      dropdownSearch.removeEventListener("focus", showDropup);
      dropdownSearch.removeEventListener("click", showDropup);
      dropdownSearch.removeEventListener("input", handleInput);
      dropdownSearch.removeEventListener("keydown", handleKeyNavigation);
    };

    element.appendChild(formContainer);
    disableFooterInputs(true);

    return cleanup;
  },
};

export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    const getCookies = () => {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=').map(c => c.trim());
        acc[name] = value;
        return acc;
      }, {});
      return cookies;
    };

    const getBrowserInfo = () => {
      const userAgent = navigator.userAgent;
      let browserName = "Unknown";
      let browserVersion = "Unknown";

      if (/chrome/i.test(userAgent)) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/chrome\/([\d.]+)/i)?.[1] || "Unknown";
      } else if (/firefox/i.test(userAgent)) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/firefox\/([\d.]+)/i)?.[1] || "Unknown";
      } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
        browserName = "Safari";
        browserVersion = userAgent.match(/version\/([\d.]+)/i)?.[1] || "Unknown";
      } else if (/msie/i.test(userAgent) || /trident/i.test(userAgent)) {
        browserName = "Internet Explorer";
        browserVersion = userAgent.match(/(msie\s|rv:)([\d.]+)/i)?.[2] || "Unknown";
      }

      return { browserName, browserVersion };
    };

    const getViewportSize = () => {
      const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      return { width, height };
    };

    const getIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
      } catch (error) {
        return "Unable to fetch IP address";
      }
    };

    const ip = await getIpAddress();
    const url = window.location.href;
    const params = new URLSearchParams(window.location.search).toString();
    const cookies = getCookies();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const time = new Date().toLocaleTimeString();
    const ts = Math.floor(Date.now() / 1000);
    const userAgent = navigator.userAgent;
    const { browserName, browserVersion } = getBrowserInfo();
    const lang = navigator.language;
    const supportsCookies = navigator.cookieEnabled;
    const platform = navigator.platform;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();

    window.voiceflow.chat.interact({
      type: "complete",
      payload: {
        ip,
        url,
        params,
        cookies,
        timezone,
        time,
        ts,
        userAgent,
        browserName,
        browserVersion,
        lang,
        supportsCookies,
        platform,
        screenResolution: `${screenWidth}x${screenHeight}`,
        viewportSize: `${viewportWidth}x${viewportHeight}`
      }
    });
  }
};

export const MultiSelectExtension = {
  name: "MultiSelect",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_multiselect" ||
    trace.payload.name === "ext_multiselect",
  render: ({ trace, element }) => {
    const { options, maxSelections } = trace.payload;
    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.classList.add("multi-select-form-unique");

    const applyGrayStyleToButton = (apply) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv) {
        const shadowRoot = chatDiv.shadowRoot;
        if (shadowRoot) {
          const buttons = shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          );
          buttons.forEach((button) => {
            button.style.backgroundColor = apply ? "#d3d3d3" : "";
            button.style.opacity = apply ? "0.5" : "";
          });
        }
      }
    };

    const disableFooterInputs = (isDisabled) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv) {
        const shadowRoot = chatDiv.shadowRoot;
        if (shadowRoot) {
          const textareas = shadowRoot.querySelectorAll("textarea");
          textareas.forEach((textarea) => {
            textarea.disabled = isDisabled;
            textarea.style.backgroundColor = isDisabled ? "#d3d3d3" : "";
            textarea.style.opacity = isDisabled ? "0.5" : "";
            textarea.style.pointerEvents = isDisabled ? "none" : "auto";
          });

          const buttons = shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          );
          buttons.forEach((button) => {
            button.disabled = isDisabled;
            button.style.pointerEvents = isDisabled ? "none" : "auto";
          });
        }
      }
    };

    element.innerHTML = "";

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap');
        
        .multi-select-form-unique {
          display: flex;
          flex-direction: column;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          font-family: 'Montserrat', sans-serif;
          max-width: 400px;
          margin: 20px auto;
        }
        .multi-select-options-unique {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }
        .multi-select-options-unique label {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          background-color: #ffffff;
          border: 1px solid #ced4da;
          cursor: pointer;
          transition: background-color 0.3s, border-color 0.3s;
          font-family: 'Montserrat', sans-serif;
        }
        .multi-select-options-unique input[type="checkbox"] {
          margin-right: 10px;
        }
        .multi-select-options-unique label:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }
        .submit-unique, .cancel-unique {
          background-color: #007bff;
          border: none;
          color: white;
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
          margin-top: 10px;
          font-family: 'Montserrat', sans-serif;
        }
        .submit-unique:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        .submit-unique:hover:not(:disabled) {
          background-color: #0056b3;
        }
        .cancel-unique {
          background-color: #dc3545;
        }
        .cancel-unique:hover {
          background-color: #c82333;
        }
        .button-group-unique {
          display: flex;
          justify-content: space-between;
        }
        .error-message-unique {
          color: #dc3545;
          font-size: 0.9em;
          margin-bottom: 10px;
          font-family: 'Montserrat', sans-serif;
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
      </style>
      <div class="multi-select-options-unique">
        ${options
          .map(
            (option) => `
          <label>
            <input type="checkbox" name="options" value="${option}">
            ${option}
          </label>
        `
          )
          .join("")}
      </div>
      <div class="error-message-unique" style="display: none;"></div>
      <div class="button-group-unique">
        <button type="submit" class="submit-unique" disabled>Select</button>
        <button type="button" class="cancel-unique">Cancel</button>
      </div>
    `;

    const optionsContainer = multiSelectContainer.querySelector(
      ".multi-select-options-unique"
    );
    const errorMessage = multiSelectContainer.querySelector(".error-message-unique");
    const submitButton = multiSelectContainer.querySelector(".submit-unique");
    const checkboxes = optionsContainer.querySelectorAll(
      'input[type="checkbox"]'
    );

    const updateSubmitButtonState = () => {
      const selected = optionsContainer.querySelectorAll(
        'input[name="options"]:checked'
      );
      submitButton.disabled = selected.length === 0;
    };

    const resetForm = () => {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      errorMessage.style.display = "none";
      submitButton.disabled = true;
    };

    resetForm();

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const selected = optionsContainer.querySelectorAll(
          'input[name="options"]:checked'
        );
        if (selected.length > maxSelections) {
          checkbox.checked = false;
          errorMessage.style.display = "block";
          errorMessage.textContent = `You can select up to ${maxSelections} options only.`;
          multiSelectContainer.style.animation = "shake 0.5s";
          setTimeout(() => {
            multiSelectContainer.style.animation = "none";
          }, 500);
        } else {
          errorMessage.style.display = "none";
        }
        updateSubmitButtonState();
      });
    });

    multiSelectContainer.addEventListener("submit", function (event) {
      event.preventDefault();
      const selectedOptions = optionsContainer.querySelectorAll(
        'input[name="options"]:checked'
      );
      const selectedOptionsValues = Array.from(selectedOptions).map(
        (option) => option.value
      );

      disableFooterInputs(false);
      applyGrayStyleToButton(false);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: {
          options: selectedOptionsValues,
        },
      });
      resetForm();
    });

    const cancelButton = multiSelectContainer.querySelector(".cancel-unique");
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();

      disableFooterInputs(false);
      applyGrayStyleToButton(false);

      resetForm();
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: {
          options: [],
        },
      });
    });

    element.appendChild(multiSelectContainer);

    disableFooterInputs(true);
    applyGrayStyleToButton(true);
  },
};

export const RankOptionsExtension = {
  name: "RankOptions",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_rankoptions" || trace.payload?.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    const options = trace.payload?.options || [];

    const disableFooterInputs = (isDisabled) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = isDisabled;
            el.style.pointerEvents = isDisabled ? "none" : "auto";
            el.style.opacity = isDisabled ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = isDisabled ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    const createForm = () => {
      const formContainer = document.createElement("form");
      formContainer.className = "_1ddzqsn7";

      formContainer.innerHTML = `
        <style>
          ._1ddzqsn7 {
            display: block;
          }
          
          .rank-options-container {
            font-family: 'Montserrat', sans-serif;
            padding: 0 4px;
          }
          
          .rank-title {
            font-size: 14px;
            margin-bottom: 16px;
            color: #303235;
          }
          
          .rank-options-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .rank-options-list li {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin-bottom: 8px;
            background-color: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 6px;
            cursor: grab;
            font-size: 14px;
            color: #303235;
          }
          
          .rank-options-list li:active {
            cursor: grabbing;
            background-color: #f8f9fa;
          }

          .rank-number {
            min-width: 24px;
            margin-right: 8px;
            color: #666;
            font-size: 14px;
          }
          
          .rank-text {
            flex: 1;
          }
          
          .submit-button {
            width: 100%;
            padding: 12px 16px;
            background-color: #545857;
            color: white;
            border: none;
            border-radius: 6px;
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            cursor: pointer;
            margin-top: 16px;
            transition: background-color 0.2s ease;
          }
          
          .submit-button:hover {
            background-color: #72727a;
          }
          
          .sortable-ghost {
            opacity: 0.5;
          }

          .sortable-drag {
            background-color: #f8f9fa;
          }
        </style>
        
        <div class="rank-options-container">
          <div class="rank-title">Drag and drop to rank options</div>
          <ul class="rank-options-list">
            ${options.map((option, index) => `
              <li data-value="${option}">
                <span class="rank-number">${index + 1}</span>
                <span class="rank-text">${option}</span>
              </li>
            `).join('')}
          </ul>
          <button type="submit" class="submit-button">Submit</button>
        </div>
      `;

      // Update rank numbers after sorting
      const updateRankNumbers = () => {
        formContainer.querySelectorAll('.rank-number').forEach((span, index) => {
          span.textContent = index + 1;
        });
      };

      formContainer.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const rankedOptions = Array.from(
          formContainer.querySelectorAll('.rank-options-list li')
        ).map(li => li.dataset.value);

        const submitButton = formContainer.querySelector('.submit-button');
        submitButton.disabled = true;
        submitButton.style.opacity = "0.5";
        
        disableFooterInputs(false);

        window.voiceflow.chat.interact({
          type: "complete",
          payload: { rankedOptions }
        });
      });

      element.appendChild(formContainer);

      if (typeof Sortable !== 'undefined') {
        new Sortable(formContainer.querySelector('.rank-options-list'), {
          animation: 150,
          onEnd: updateRankNumbers,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag'
        });
      }
    };

    if (typeof Sortable === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = createForm;
      script.onerror = () => console.error('Failed to load Sortable.js');
      document.head.appendChild(script);
    } else {
      createForm();
    }

    disableFooterInputs(true);
  },
};
export const DelayEffectExtension = {
  name: "DelayEffect",
  type: "effect",
  match: ({ trace }) => trace.type === "ext_delay" || trace.payload?.name === "ext_delay",
  effect: async ({ trace }) => {
    // Disable chat input
    const disableChat = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          buttons: chatDiv.shadowRoot.querySelectorAll("button"),
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
          });
        });
      }
    };

    try {
      // Disable chat input during delay
      disableChat(true);

      // Execute delay
      const delay = trace.payload?.delay || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Re-enable chat input
      disableChat(false);

      // Move to next block
      window.voiceflow.chat.interact({ type: "complete" });
    } catch (error) {
      // Ensure chat input is re-enabled even if there's an error
      disableChat(false);
      window.voiceflow.chat.interact({ type: "complete" });
    }
  }
};
