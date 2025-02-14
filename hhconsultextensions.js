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
        transition: all 0.2s ease;
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
        transform: translateY(-1px);
      }

      .dropdown-extension-invalid {
        border-color: #ff4444 !important;
      }

      .dropdown-extension-options::-webkit-scrollbar {
        width: 4px;
      }

      .dropdown-extension-options::-webkit-scrollbar-track {
        background: transparent;
      }

      .dropdown-extension-options::-webkit-scrollbar-thumb {
        background: #72727a;
        border-radius: 2px;
      }

      .dropdown-extension-input[type="text"] {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23545857' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .dropdown-extension-options.visible {
        display: block;
        animation: fadeIn 0.2s ease;
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

    const showDropup = () => {
      dropdownOptionsDiv.classList.add("visible");
    };

    const hideDropup = () => {
      dropdownOptionsDiv.classList.remove("visible");
      highlightedIndex = -1;
      updateHighlight();
    };

    const updateHighlight = () => {
      const options = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
      options.forEach((option, index) => {
        option.classList.toggle("highlighted", index === highlightedIndex);
      });
    };

    const handleKeyNavigation = (e) => {
      const visibleOptions = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
      
      switch(e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!dropdownOptionsDiv.classList.contains("visible")) {
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
            visibleOptions[highlightedIndex].click();
          }
          break;
        case "Escape":
          hideDropup();
          dropdownSearch.blur();
          break;
      }
    };

    dropdownSearch.addEventListener("focus", (e) => {
      e.stopPropagation();
      showDropup();
    });

    dropdownSearch.addEventListener("click", (e) => {
      e.stopPropagation();
      showDropup();
    });

    dropdownSearch.addEventListener("input", (e) => {
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
    });

    dropdownSearch.addEventListener("keydown", handleKeyNavigation);

    dropdownOptionsDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.tagName === "DIV") {
        const selectedValue = e.target.getAttribute("data-value");
        dropdownSearch.value = selectedValue;
        hiddenDropdownInput.value = selectedValue;
        hideDropup();
        enableSubmitButton();
        dropdownSearch.blur();
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
      submitButton.remove();
      disableFooterInputs(false);
      window.voiceflow.chat.interact({
        type: "complete",
        payload: { dropdown: hiddenDropdownInput.value },
      });
    });

    element.appendChild(formContainer);
    disableFooterInputs(true);
  },
};

export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    // Utility function for safe data collection
    const safeCollect = (fn, defaultValue = "Unknown") => {
      try {
        return fn() || defaultValue;
      } catch (error) {
        console.warn(`Error collecting browser data: ${error.message}`);
        return defaultValue;
      }
    };

    // Enhanced cookie collection with parsing
    const getCookies = () => {
      try {
        return document.cookie.split(';')
          .filter(cookie => cookie.trim())
          .reduce((acc, cookie) => {
            const [name, ...values] = cookie.split('=').map(c => c.trim());
            const value = values.join('='); // Handle values containing '='
            if (name) acc[name] = value;
            return acc;
          }, {});
      } catch (error) {
        console.warn(`Cookie parsing error: ${error.message}`);
        return {};
      }
    };

    // Enhanced browser detection
    const getBrowserInfo = () => {
      const userAgent = navigator.userAgent;
      const browsers = [
        { name: 'Edge', regex: /edg\/([\d.]+)/i },
        { name: 'Chrome', regex: /chrome\/([\d.]+)/i },
        { name: 'Firefox', regex: /firefox\/([\d.]+)/i },
        { name: 'Safari', regex: /version\/([\d.]+).*safari/i },
        { name: 'Opera', regex: /opr\/([\d.]+)/i },
        { name: 'Internet Explorer', regex: /(msie\s|rv:)([\d.]+)/i }
      ];

      for (const browser of browsers) {
        const match = userAgent.match(browser.regex);
        if (match) {
          return {
            browserName: browser.name,
            browserVersion: match[1] || "Unknown"
          };
        }
      }

      return { browserName: "Unknown", browserVersion: "Unknown" };
    };

    // Enhanced viewport and screen info
    const getDisplayInfo = () => {
      const dpr = window.devicePixelRatio || 1;
      const viewport = {
        width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      };
      const screen = {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        orientation: screen.orientation?.type || "Unknown"
      };

      return { viewport, screen, dpr };
    };

    // Enhanced IP address collection with timeout
    const getIpAddress = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://api.ipify.org?format=json', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        return data.ip;
      } catch (error) {
        console.warn(`IP fetch error: ${error.message}`);
        return "Unable to fetch IP";
      }
    };

    // Additional system capabilities detection
    const getSystemCapabilities = () => ({
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      webGL: (() => {
        try {
          return !!window.WebGLRenderingContext && 
                 !!document.createElement('canvas').getContext('webgl');
        } catch (e) {
          return false;
        }
      })(),
      touchscreen: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
      languages: navigator.languages || [navigator.language],
      doNotTrack: navigator.doNotTrack || window.doNotTrack,
      onlineStatus: navigator.onLine
    });

    // Collect all data
    const { viewport, screen, dpr } = getDisplayInfo();
    const { browserName, browserVersion } = getBrowserInfo();
    const capabilities = getSystemCapabilities();
    const ip = await getIpAddress();

    // Prepare payload with all collected data
    const payload = {
      ip,
      url: safeCollect(() => window.location.href),
      referrer: safeCollect(() => document.referrer),
      params: safeCollect(() => new URLSearchParams(window.location.search).toString()),
      cookies: getCookies(),
      timezone: safeCollect(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
      time: new Date().toISOString(),
      ts: Math.floor(Date.now() / 1000),
      userAgent: navigator.userAgent,
      browserName,
      browserVersion,
      platform: {
        os: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: capabilities.languages
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        orientation: screen.orientation,
        dpr
      },
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      capabilities: {
        ...capabilities,
        connection: navigator.connection ? {
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData
        } : null
      }
    };

    // Send collected data
    try {
      await window.voiceflow.chat.interact({
        type: "complete",
        payload
      });
    } catch (error) {
      console.error("Failed to send browser data:", error);
      // Attempt to send minimal payload if full payload fails
      await window.voiceflow.chat.interact({
        type: "complete",
        payload: {
          error: "Failed to collect complete browser data",
          browserName,
          browserVersion,
          timestamp: Date.now()
        }
      });
    }
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
  match: ({ trace }) => trace.type === "ext_rankoptions" || trace.payload.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    const { options } = trace.payload;

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

    const createForm = () => {
      const formContainer = document.createElement("form");
      formContainer.classList.add("rank-options-form");

      element.innerHTML = "";

      formContainer.innerHTML = `
        <style>
          .rank-options-form {
            display: flex;
            flex-direction: column;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            font-family: 'Montserrat', sans-serif;
            width: 243px;
            color: black;
          }
          .rank-options-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .rank-options-list li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            margin-bottom: 10px;
            background-color: #ffffff;
            border: 1px solid #ced4da;
            border-radius: 4px;
            cursor: grab;
            color: black;
          }
          .rank-options-form .submit-button {
            background-color: #545857;
            border: none;
            color: white;
            padding: 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
            margin-top: 10px;
            font-family: 'Montserrat', sans-serif; 
            font-size: 16px; 
          }
          .rank-options-form .submit-button:hover {
            background-color: #545857;
          }
        </style>
        <h3>Drag and drop to rank options</h4>
        <ul class="rank-options-list">
          ${options.map(option => `
            <li data-value="${option}">
              <span>${option}</span>
            </li>
          `).join('')}
        </ul>
        <button type="submit" class="submit-button">Submit</button>
      `;

      formContainer.addEventListener("submit", function (event) {
        event.preventDefault();
        const rankedOptions = Array.from(formContainer.querySelectorAll('.rank-options-list li'))
          .map(li => li.dataset.value);

        disableFooterInputs(false);
        applyGrayStyleToButton(false);

        window.voiceflow.chat.interact({
          type: "complete",
          payload: { rankedOptions },
        });
      });

      element.appendChild(formContainer);

      initializeSortable();

      disableFooterInputs(true);
      applyGrayStyleToButton(true);
    };

    function initializeSortable() {
      const rankOptionsList = element.querySelector('.rank-options-list');
      if (rankOptionsList) {
        new Sortable(rankOptionsList, {
          animation: 150,
          onEnd: () => {}
        });
      }
    }

    if (typeof Sortable === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => {
        createForm();
      };
      script.onerror = () => {};
      document.head.appendChild(script);
    } else {
      createForm();
    }
  },
};

export const DelayEffectExtension = {
  name: "DelayEffect",
  type: "effect",
  match: ({ trace }) => trace.type === "ext_delay" || trace.payload.name === "ext_delay",
  effect: async ({ trace }) => {
    const { delay } = trace.payload;

    await new Promise(resolve => setTimeout(resolve, delay));

    window.voiceflow.chat.interact({ type: "complete" });
  }
};
