export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    // Utility function to safely execute and handle errors
    const safeExecute = async (fn, fallback = "Unknown") => {
      try {
        return await fn();
      } catch (error) {
        console.warn(`BrowserData Extension: ${error.message}`);
        return fallback;
      }
    };

    // Browser and System Information
    const getBrowserInfo = () => {
      const userAgent = navigator.userAgent;
      const browserData = {
        browserName: "Unknown",
        browserVersion: "Unknown",
        engine: "Unknown",
        engineVersion: "Unknown"
      };

      // Browser detection patterns
      const patterns = [
        { name: "Edge", regex: /edg\/([\d.]+)/i },
        { name: "Chrome", regex: /chrome\/([\d.]+)/i },
        { name: "Firefox", regex: /firefox\/([\d.]+)/i },
        { name: "Safari", regex: /version\/([\d.]+).*safari/i },
        { name: "Opera", regex: /opr\/([\d.]+)/i },
        { name: "IE", regex: /(msie\s|rv:)([\d.]+)/i }
      ];

      // Engine detection
      const enginePatterns = [
        { name: "Blink", regex: /chrome\//i },
        { name: "Gecko", regex: /gecko\//i },
        { name: "WebKit", regex: /webkit\//i },
        { name: "Trident", regex: /trident\//i }
      ];

      // Find matching browser
      for (const pattern of patterns) {
        const match = userAgent.match(pattern.regex);
        if (match) {
          browserData.browserName = pattern.name;
          browserData.browserVersion = match[1];
          break;
        }
      }

      // Find matching engine
      for (const pattern of enginePatterns) {
        if (pattern.regex.test(userAgent)) {
          browserData.engine = pattern.name;
          const match = userAgent.match(/(?:gecko|webkit|trident)\/([\d.]+)/i);
          browserData.engineVersion = match?.[1] || "Unknown";
          break;
        }
      }

      return browserData;
    };

    // System Capabilities
    const getSystemCapabilities = () => ({
      cookiesEnabled: navigator.cookieEnabled,
      javaEnabled: navigator.javaEnabled?.(),
      doNotTrack: navigator.doNotTrack || "Unknown",
      touchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || "Unknown",
      deviceMemory: navigator.deviceMemory || "Unknown",
      platform: navigator.platform,
      vendor: navigator.vendor,
      onLine: navigator.onLine,
      connectionType: navigator.connection?.type || "Unknown",
      connectionSpeed: navigator.connection?.effectiveType || "Unknown",
    });

    // Screen and Viewport Information
    const getDisplayInfo = () => {
      const screen = window.screen;
      return {
        screenResolution: `${screen.width}x${screen.height}`,
        screenColorDepth: screen.colorDepth,
        screenPixelRatio: window.devicePixelRatio,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        viewportOrientation: screen.orientation?.type || "Unknown",
      };
    };

    // Location and Time Information
    const getLocationInfo = () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        url: window.location.href,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        queryParams: Object.fromEntries(new URLSearchParams(window.location.search)),
        hash: window.location.hash,
        timeZone,
        locale: navigator.language,
        languages: navigator.languages,
        timestamp: Date.now(),
        timezoneOffset: new Date().getTimezoneOffset(),
      };
    };

    // Cookie Information
    const getCookieInfo = () => {
      const cookies = {};
      if (document.cookie) {
        document.cookie.split(';').forEach(cookie => {
          const [name, value] = cookie.split('=').map(c => c.trim());
          if (name) cookies[name] = value;
        });
      }
      return cookies;
    };

    // Get IP Address
    const getIpAddress = async () => {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) throw new Error('Failed to fetch IP address');
      const data = await response.json();
      return data.ip;
    };

    // Collect all data
    const browserData = await safeExecute(async () => {
      const [ipAddress, browserInfo, systemCaps, displayInfo, locationInfo, cookieInfo] = 
        await Promise.all([
          safeExecute(getIpAddress, "Unknown"),
          safeExecute(getBrowserInfo, {}),
          safeExecute(getSystemCapabilities, {}),
          safeExecute(getDisplayInfo, {}),
          safeExecute(getLocationInfo, {}),
          safeExecute(getCookieInfo, {})
        ]);

      return {
        ip: ipAddress,
        browser: browserInfo,
        system: systemCaps,
        display: displayInfo,
        location: locationInfo,
        cookies: cookieInfo,
        userAgent: navigator.userAgent,
        collected_at: new Date().toISOString()
      };
    }, {});

    // Send data back to chat
    window.voiceflow.chat.interact({
      type: "complete",
      payload: browserData
    });
  }
};

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

export const MultiSelectExtension = {
  name: "MultiSelect",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_multiselect" ||
    trace.payload?.name === "ext_multiselect",
  render: ({ trace, element }) => {
    const options = trace.payload?.options || [];
    const maxSelections = trace.payload?.maxSelections || options.length;

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

    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.className = "_1ddzqsn7";

    multiSelectContainer.innerHTML = `
      <style>
        ._1ddzqsn7 {
          display: block;
        }
        
        .multi-select-container {
          font-family: 'Montserrat', sans-serif;
          width: 100%;
        }
        
        .multi-select-title {
          font-size: 14px;
          color: #72727a;
          margin-bottom: 12px;
        }
        
        .multi-select-subtitle {
          font-size: 13px;
          color: #72727a;
          margin-bottom: 16px;
          opacity: 0.8;
        }
        
        .multi-select-options {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .option-label {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        
        .option-label:hover {
          border-color: #545857;
          transform: translateX(2px);
        }
        
        .checkbox-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-right: 12px;
          border: 2px solid #72727a;
          border-radius: 4px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .option-label:hover .checkbox-wrapper {
          border-color: #545857;
        }
        
        .checkbox-input {
          display: none;
        }
        
        .checkbox-input:checked + .checkbox-wrapper {
          background: #545857;
          border-color: #545857;
        }
        
        .checkbox-input:checked + .checkbox-wrapper:after {
          content: '';
          width: 6px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-1px, -1px);
          display: block;
        }
        
        .option-text {
          font-size: 14px;
          color: #303235;
          line-height: 1.4;
        }
        
        .error-message {
          color: #ff4444;
          font-size: 13px;
          margin: -8px 0 12px;
          display: none;
          animation: slideIn 0.3s ease;
        }
        
        .button-group {
          display: grid;
          gap: 8px;
        }
        
        .submit-button, .cancel-button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .submit-button {
          background: #545857;
          color: white;
        }
        
        .submit-button:not(:disabled):hover {
          background: #72727a;
          transform: translateY(-1px);
        }
        
        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .cancel-button {
          background: transparent;
          color: #72727a;
          border: 1px solid rgba(114, 114, 122, 0.2);
        }
        
        .cancel-button:hover {
          background: rgba(114, 114, 122, 0.1);
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        .shake {
          animation: shake 0.3s ease;
        }
      </style>
      
      <div class="multi-select-container">
        <div class="multi-select-title">Select your options</div>
        ${maxSelections < options.length ? 
          `<div class="multi-select-subtitle">Choose up to ${maxSelections} options</div>` : 
          ''}
        <div class="multi-select-options">
          ${options.map((option, index) => `
            <label class="option-label" style="animation-delay: ${index * 0.05}s">
              <input type="checkbox" class="checkbox-input" name="options" value="${option}">
              <div class="checkbox-wrapper"></div>
              <span class="option-text">${option}</span>
            </label>
          `).join('')}
        </div>
        <div class="error-message"></div>
        <div class="button-group">
          <button type="submit" class="submit-button" disabled>Submit</button>
          <button type="button" class="cancel-button">Cancel</button>
        </div>
      </div>
    `;

    let isSubmitted = false;
    const errorMessage = multiSelectContainer.querySelector(".error-message");
    const submitButton = multiSelectContainer.querySelector(".submit-button");
    const checkboxes = multiSelectContainer.querySelectorAll('input[type="checkbox"]');

    const updateSubmitButton = () => {
      if (isSubmitted) return;
      const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
      submitButton.disabled = selectedCount === 0;
    };

    const showError = (message) => {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
      multiSelectContainer.querySelector('.multi-select-options').classList.add('shake');
      setTimeout(() => {
        multiSelectContainer.querySelector('.multi-select-options').classList.remove('shake');
      }, 300);
    };

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        if (isSubmitted) return;
        
        const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
        
        if (selectedCount > maxSelections) {
          checkbox.checked = false;
          showError(`You can select up to ${maxSelections} options`);
        } else {
          errorMessage.style.display = "none";
        }
        
        updateSubmitButton();
      });
    });

    multiSelectContainer.addEventListener("submit", (e) => {
      e.preventDefault();
      if (isSubmitted) return;

      const selectedOptions = Array.from(
        multiSelectContainer.querySelectorAll('input[name="options"]:checked')
      ).map(input => input.value);

      isSubmitted = true;
      
      // Disable all inputs
      checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = "0.7";
        checkbox.parentElement.style.cursor = "not-allowed";
      });
      
      submitButton.disabled = true;
      submitButton.style.opacity = "0.5";
      
      disableFooterInputs(false);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: { options: selectedOptions }
      });
    });

    multiSelectContainer.querySelector(".cancel-button").addEventListener("click", () => {
      if (isSubmitted) return;
      
      disableFooterInputs(false);
      
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { options: [] }
      });
    });

    element.innerHTML = '';
    element.appendChild(multiSelectContainer);
    disableFooterInputs(true);
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
            padding: 0;
            width: 100%;
          }
          
          .rank-title {
            font-size: 14px;
            margin-bottom: 12px;
            color: #303235;
            opacity: 0.8;
          }
          
          .rank-options-list {
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          
          .rank-options-list li {
            display: flex;
            align-items: center;
            padding: 12px 14px;
            margin-bottom: 8px;
            background-color: white;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 8px;
            cursor: grab;
            font-size: 14px;
            color: #303235;
            width: 100%;
            box-sizing: border-box;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }
          
          .rank-options-list li:before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 4px;
            background: #545857;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          .rank-options-list li:hover {
            border-color: rgba(84, 88, 87, 0.3);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            transform: translateX(2px);
          }
          
          .rank-options-list li:hover:before {
            opacity: 1;
          }
          
          .rank-options-list li:active {
            cursor: grabbing;
            background-color: #f8f9fa;
            transform: scale(1.02);
          }

          .rank-options-list.disabled li {
            cursor: not-allowed;
            opacity: 0.7;
            pointer-events: none;
          }

          .rank-number {
            min-width: 24px;
            color: #666;
            font-size: 14px;
            font-weight: 500;
            margin-right: 10px;
            user-select: none;
            transition: color 0.2s ease;
          }
          
          li:hover .rank-number {
            color: #545857;
          }
          
          .rank-text {
            flex: 1;
            padding-right: 4px;
            line-height: 1.4;
          }
          
          .submit-button {
            width: 100%;
            padding: 12px 16px;
            background-color: #545857;
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 16px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .submit-button:not(:disabled):hover {
            background-color: #72727a;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .submit-button:not(:disabled):active {
            transform: translateY(0);
          }

          .submit-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #72727a;
          }
          
          .sortable-ghost {
            opacity: 0.3;
            background: #f5f5f5;
            border: 2px dashed #545857;
          }

          .sortable-drag {
            background-color: #fff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-color: #545857;
            transform: rotate(2deg);
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .rank-options-list li {
            animation: slideIn 0.3s ease forwards;
            animation-delay: calc(var(--item-index) * 0.05s);
            opacity: 0;
          }

          .rank-handle {
            width: 8px;
            height: 14px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2px;
            margin-left: auto;
            opacity: 0.3;
            transition: opacity 0.2s ease;
          }

          .rank-handle::before,
          .rank-handle::after {
            content: '';
            width: 100%;
            height: 2px;
            background: #303235;
            border-radius: 1px;
          }

          li:hover .rank-handle {
            opacity: 0.6;
          }

          .submitted-message {
            color: #72727a;
            font-size: 13px;
            text-align: center;
            margin-top: 12px;
            font-style: italic;
          }
        </style>
        
        <div class="rank-options-container">
          <div class="rank-title">Drag and drop to rank in order of preference</div>
          <ul class="rank-options-list">
            ${options.map((option, index) => `
              <li data-value="${option}" style="--item-index: ${index}">
                <span class="rank-number">${index + 1}</span>
                <span class="rank-text">${option}</span>
                <div class="rank-handle"></div>
              </li>
            `).join('')}
          </ul>
          <button type="submit" class="submit-button">Submit</button>
        </div>
      `;

      let isSubmitted = false;
      let sortableInstance = null;

      const updateRankNumbers = () => {
        if (!isSubmitted) {
          formContainer.querySelectorAll('.rank-number').forEach((span, index) => {
            span.textContent = index + 1;
          });
        }
      };

      const disableRanking = () => {
        const list = formContainer.querySelector('.rank-options-list');
        const submitButton = formContainer.querySelector('.submit-button');
        
        // Disable the list
        list.classList.add('disabled');
        
        // Disable the submit button
        submitButton.disabled = true;
        
        // Destroy sortable instance
        if (sortableInstance) {
          sortableInstance.destroy();
        }

        // Add submitted message
        const message = document.createElement('div');
        message.className = 'submitted-message';
        message.textContent = 'Rankings submitted';
        submitButton.insertAdjacentElement('afterend', message);
      };

      formContainer.addEventListener("submit", (e) => {
        e.preventDefault();
        
        if (isSubmitted) return;
        
        const rankedOptions = Array.from(
          formContainer.querySelectorAll('.rank-options-list li')
        ).map(li => li.dataset.value);

        isSubmitted = true;
        disableRanking();
        disableFooterInputs(false);

        window.voiceflow.chat.interact({
          type: "complete",
          payload: { rankedOptions }
        });
      });

      element.appendChild(formContainer);

      if (typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(formContainer.querySelector('.rank-options-list'), {
          animation: 150,
          onEnd: updateRankNumbers,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
          disabled: isSubmitted
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
  match: ({ trace }) => 
    trace.type === "ext_delay" || trace.payload?.name === "ext_delay",
  effect: async ({ trace }) => {
    try {
      // Get delay value with validation
      const delay = Math.max(
        0,
        parseInt(trace.payload?.delay) || 1000
      );

      // Function to disable/enable chat inputs
      const disableInputs = (isDisabled) => {
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

      // Hide any existing scroll indicators
      const hideScrollIndicators = () => {
        document.querySelectorAll('[class*="scroll-down"], [class*="scroll-button"]')
          .forEach(el => {
            el.style.display = 'none';
          });
      };

      // Initial cleanup and disable inputs
      hideScrollIndicators();
      disableInputs(true);

      // Execute delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Cleanup and re-enable inputs
      hideScrollIndicators();
      disableInputs(false);

      // Move to next block
      window.voiceflow.chat.interact({ 
        type: "complete",
        payload: { delay: delay }
      });

    } catch (error) {
      console.error('DelayEffect Extension Error:', error);
      // Re-enable inputs even if there's an error
      disableInputs(false);
      window.voiceflow.chat.interact({ type: "complete" });
    }
  }
};

export const TransitionAnimationExtension = {
  name: "TransitionAnimation",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_transitionAnimation" || 
    trace.payload?.name === "ext_transitionAnimation",
  render: ({ trace, element }) => {
    const duration = parseInt(trace.payload?.duration) || 2000;
    const completionDelay = 800;
    const actualDuration = duration - completionDelay;
    
    const disableInputs = (disable) => {
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
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
          });
        });
      }
    };

    const animationContainer = document.createElement("div");
    animationContainer.className = "_1ddzqsn7";

    animationContainer.innerHTML = `
      <style>
        ._1ddzqsn7 {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0;
          background: none;
        }

        .processing-container {
          position: relative;
          height: 36px;
          width: 100%;
          border-radius: 4px;
          margin: 0;
          padding: 0;
          background: rgba(52, 211, 153, 0.1);
          overflow: hidden;
        }

        .liquid-fill {
          position: absolute;
          top: 0;
          left: 0;
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #34D399, #059669);
          animation: fillProgress ${actualDuration}ms linear forwards;
        }

        .liquid-fill::after {
          content: '';
          position: absolute;
          top: -50%;
          left: 0;
          width: 100%;
          height: 200%;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.1) 10px,
            rgba(255,255,255,0.1) 20px
          );
          animation: waterPattern 20s linear infinite;
        }

        .liquid-fill::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.2),
            transparent
          );
          animation: shimmer 2s linear infinite;
        }

        .wave {
          position: absolute;
          top: -100%;
          right: 0;
          width: 200px;
          height: 200px;
          background: radial-gradient(
            circle at center,
            rgba(255,255,255,0.4) 0%,
            transparent 70%
          );
          border-radius: 45%;
          animation: rotate 10s linear infinite;
        }

        .processing-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: white;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .bubbles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          background: rgba(255,255,255,0.4);
          border-radius: 50%;
          animation: bubble 4s ease-in infinite;
        }

        @keyframes fillProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes waterPattern {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(-100px) translateY(-100px); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes bubble {
          0% {
            transform: translateY(100%) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100%) scale(1);
            opacity: 0;
          }
        }

        .success .liquid-fill {
          background: linear-gradient(90deg, #059669, #047857);
          transition: background 0.3s ease;
        }

        .checkmark {
          display: inline-block;
          transform: rotate(45deg);
          height: 12px;
          width: 6px;
          border-bottom: 2px solid white;
          border-right: 2px solid white;
          opacity: 0;
          margin-left: 4px;
          animation: checkmarkAnimation 0.5s ease forwards;
        }

        @keyframes checkmarkAnimation {
          0% {
            opacity: 0;
            transform: rotate(45deg) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: rotate(45deg) scale(1);
          }
        }
      </style>

      <div class="processing-container">
        <div class="liquid-fill">
          <div class="wave"></div>
          <div class="wave" style="animation-delay: -2s; animation-duration: 7s;"></div>
          <div class="bubbles">
            ${Array.from({length: 10}, (_, i) => `
              <div class="bubble" style="
                left: ${Math.random() * 100}%;
                width: ${4 + Math.random() * 4}px;
                height: ${4 + Math.random() * 4}px;
                animation-delay: ${Math.random() * 4}s;
              "></div>
            `).join('')}
          </div>
        </div>
        <div class="processing-content">Processing</div>
      </div>
    `;

    const container = animationContainer.querySelector('.processing-container');
    const processingText = animationContainer.querySelector('.processing-content');

    disableInputs(true);
    element.appendChild(animationContainer);

    setTimeout(() => {
      container.classList.add('success');
      processingText.innerHTML = 'Complete <span class="checkmark"></span>';
      
      setTimeout(() => {
        disableInputs(false);
        window.voiceflow.chat.interact({ type: "complete" });
      }, completionDelay);
    }, actualDuration);
  }
};

export const StripePaymentExtension = {
  name: "StripePayment",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_stripePayment" || 
    trace.payload?.name === "ext_stripePayment",
  render: ({ trace, element }) => {
    const paymentUrl = trace.payload?.paymentUrl;
    const buttonText = trace.payload?.buttonText || "Pay Now";
    const laterButtonText = trace.payload?.laterButtonText || "Pay Later";
    const autoRedirect = trace.payload?.autoRedirect || false;
    const redirectDelay = trace.payload?.redirectDelay || 5000;
    const autoRedirectText = trace.payload?.autoRedirectText || "Redirecting to secure payment in";

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

    const paymentContainer = document.createElement("div");
    paymentContainer.className = "_1ddzqsn7";

    paymentContainer.innerHTML = `
      <style>
        ._1ddzqsn7 {
          display: block;
        }
        
        .payment-container {
          font-family: 'Montserrat', sans-serif;
          padding: 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          margin: 8px 0;
        }

        .payment-title {
          font-size: 14px;
          color: #303235;
          margin-bottom: 12px;
        }

        .button-group {
          display: grid;
          gap: 8px;
          margin-top: ${autoRedirect ? '12px' : '0'};
        }

        .payment-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #635bff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .payment-button:hover {
          background: #5851e9;
          transform: translateY(-1px);
        }

        .later-button {
          background: transparent;
          color: #72727a;
          border: 1px solid rgba(114, 114, 122, 0.2);
        }

        .later-button:hover {
          background: rgba(114, 114, 122, 0.1);
        }

        .redirect-countdown {
          margin-bottom: 12px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
          font-size: 13px;
          color: #4a5568;
          text-align: center;
        }

        .countdown-number {
          font-weight: 600;
          color: #635bff;
          margin: 0 4px;
        }

        .redirect-progress {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }

        .redirect-progress-bar {
          height: 100%;
          background: #635bff;
          width: 100%;
          transition: width linear;
        }

        .payment-link {
          margin-top: 12px;
          padding: 8px;
          background: #f7fafc;
          border-radius: 6px;
          font-size: 12px;
          color: #4a5568;
          word-break: break-all;
          display: none;
        }
      </style>

      <div class="payment-container">
        <div class="payment-title">Complete your payment to proceed</div>
        
        ${autoRedirect ? `
          <div class="redirect-countdown">
            <span>${autoRedirectText}</span>
            <span class="countdown-number">${Math.ceil(redirectDelay/1000)}</span>
            <span>seconds</span>
            <div class="redirect-progress">
              <div class="redirect-progress-bar"></div>
            </div>
          </div>
        ` : ''}
        
        <div class="button-group">
          <button class="payment-button" id="stripePaymentBtn">
            <svg class="payment-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/>
              <path d="M4 8h16M8 14h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${buttonText}
          </button>
          <button class="payment-button later-button" id="payLaterBtn">
            ${laterButtonText}
          </button>
        </div>

        <div class="payment-link">
          If the payment page doesn't open automatically, <a href="${paymentUrl}" target="_blank">click here</a>
        </div>
      </div>
    `;

    const handlePayment = () => {
      const button = paymentContainer.querySelector('#stripePaymentBtn');
      const laterButton = paymentContainer.querySelector('#payLaterBtn');
      const countdown = paymentContainer.querySelector('.redirect-countdown');
      const paymentLink = paymentContainer.querySelector('.payment-link');
      
      // Disable buttons
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.pointerEvents = 'none';
      laterButton.style.display = 'none';
      
      if (countdown) {
        countdown.style.display = 'none';
      }

      // Show payment link as fallback
      paymentLink.style.display = 'block';

      // Try to open in new tab
      const newWindow = window.open(paymentUrl, '_blank');
      
      // Complete the interaction
      window.voiceflow.chat.interact({
        type: "complete",
        payload: { 
          status: "payment_initiated",
          paymentUrl 
        }
      });
    };

    const handlePayLater = () => {
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { 
          status: "payment_delayed"
        }
      });
    };

    // Disable inputs immediately
    disableFooterInputs(true);

    const paymentButton = paymentContainer.querySelector('#stripePaymentBtn');
    const laterButton = paymentContainer.querySelector('#payLaterBtn');
    
    paymentButton.addEventListener('click', handlePayment);
    laterButton.addEventListener('click', handlePayLater);

    // Handle auto-redirect
    if (autoRedirect && paymentUrl) {
      const countdownElement = paymentContainer.querySelector('.countdown-number');
      const progressBar = paymentContainer.querySelector('.redirect-progress-bar');
      let timeLeft = Math.ceil(redirectDelay/1000);

      // Start progress bar animation
      if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
          progressBar.style.width = '0%';
          progressBar.style.transition = `width ${redirectDelay}ms linear`;
        }, 50);
      }

      // Start countdown
      const countdown = setInterval(() => {
        timeLeft -= 1;
        if (countdownElement) {
          countdownElement.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
          clearInterval(countdown);
          handlePayment();
        }
      }, 1000);

      // Allow manual click during countdown
      paymentButton.addEventListener('click', () => {
        clearInterval(countdown);
      });
    }

    element.appendChild(paymentContainer);
  },
};
