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
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #34D399 0%, #059669 100%);
          position: relative;
          overflow: hidden;
          height: 36px;
          width: 100%;
          border-radius: 4px;
          margin: 0;
          padding: 0;
          transform-origin: center;
          animation: subtlePulse 2s infinite;
        }

        .processing-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .processing-text {
          color: white;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          animation: fadeInUp 0.5s ease forwards;
        }

        .progress-bar-container {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 36px;
          overflow: hidden;
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, 
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.1) 50%,
            rgba(255,255,255,0) 100%);
          width: 0%;
          animation: progress ${actualDuration}ms linear forwards,
                     shimmer 2s infinite;
        }

        .dots-container {
          display: flex;
          gap: 3px;
          align-items: center;
        }

        .dot {
          width: 3px;
          height: 3px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
          animation: pulse 1s infinite;
          box-shadow: 0 0 4px rgba(255,255,255,0.5);
        }

        .dot:nth-child(2) { 
          animation-delay: 0.2s;
          background: rgba(255,255,255,0.9);
        }
        .dot:nth-child(3) { 
          animation-delay: 0.4s;
          background: rgba(255,255,255,0.8);
        }

        .shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.2) 50%,
            transparent 100%
          );
          animation: shine 3s infinite;
        }

        /* Success state animations */
        .processing-container.success {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          animation: successPulse 0.5s ease forwards;
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
        }

        .success .checkmark {
          animation: checkmarkAnimation 0.5s ease forwards;
        }

        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.002); }
        }

        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 1; }
        }

        @keyframes shine {
          0% { left: -100%; }
          20%, 100% { left: 100%; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
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
        <div class="shine"></div>
        <div class="progress-bar-container">
          <div class="progress-bar"></div>
        </div>
        <div class="processing-content">
          <div class="processing-text">
            Processing
            <div class="dots-container">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = animationContainer.querySelector('.processing-container');
    const processingText = animationContainer.querySelector('.processing-text');

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
