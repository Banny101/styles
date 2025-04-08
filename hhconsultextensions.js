export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    // Disable input while collecting data
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        // Disable/enable the entire input container
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
        }

        // Disable/enable specific elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
          voiceButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Voice input']"
          ),
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = disable ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    // Show loading indicator
    const showLoadingIndicator = () => {
      const chatContainer = document.querySelector('.vfrc-chat-messages');
      if (!chatContainer) return null;
      
      const loadingElement = document.createElement('div');
      loadingElement.className = 'browser-data-loading';
      loadingElement.innerHTML = `
        <style>
          .browser-data-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            margin: 8px 0;
            background: rgba(84, 88, 87, 0.05);
            border-radius: 8px;
            font-family: 'Montserrat', sans-serif;
            font-size: 13px;
            color: #72727a;
          }
          
          .loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #e2e8f0;
            border-top-color: #72727a;
            border-radius: 50%;
            margin-right: 8px;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
        <div class="loading-spinner"></div>
        <span>Collecting browser data...</span>
      `;
      
      chatContainer.appendChild(loadingElement);
      return loadingElement;
    };

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
      batteryLevel: null, // Will be populated if available
      deviceType: detectDeviceType(),
    });

    // Detect device type
    const detectDeviceType = () => {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "tablet";
      }
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return "mobile";
      }
      return "desktop";
    };

    // Try to get battery info if available
    const getBatteryInfo = async () => {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
      return null;
    };

    // Screen and Viewport Information
    const getDisplayInfo = () => {
      const screen = window.screen;
      return {
        screenResolution: `${screen.width}x${screen.height}`,
        screenColorDepth: screen.colorDepth,
        screenPixelRatio: window.devicePixelRatio,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        viewportOrientation: screen.orientation?.type || "Unknown",
        isFullScreen: document.fullscreenElement !== null,
        isReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        prefersColorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
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
        formattedDate: new Date().toLocaleString(),
        referrer: document.referrer || "Unknown",
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
      try {
        // Try multiple services in case one fails
        const services = [
          'https://api.ipify.org?format=json',
          'https://api.myip.com',
          'https://api.db-ip.com/v2/free/self'
        ];
        
        for (const service of services) {
          try {
            const response = await fetch(service);
            if (response.ok) {
              const data = await response.json();
              // Different APIs return IP in different formats
              return data.ip || data.ipAddress || data.address || "Unknown";
            }
          } catch (e) {
            console.warn(`IP service ${service} failed: ${e.message}`);
          }
        }
        
        throw new Error('All IP services failed');
      } catch (error) {
        console.warn(`Failed to fetch IP address: ${error.message}`);
        return "Unknown";
      }
    };

    try {
      // Disable inputs while collecting data
      toggleInputs(true);
      
      // Show loading indicator
      const loadingIndicator = showLoadingIndicator();
      
      // Collect all data
      const browserData = await safeExecute(async () => {
        // Try to get battery info
        const batteryInfo = await safeExecute(getBatteryInfo, null);
        
        // Get system capabilities and add battery info if available
        const systemCaps = await safeExecute(getSystemCapabilities, {});
        if (batteryInfo) {
          systemCaps.batteryLevel = batteryInfo.level;
          systemCaps.batteryCharging = batteryInfo.charging;
        }
        
        const [ipAddress, browserInfo, displayInfo, locationInfo, cookieInfo] = 
          await Promise.all([
            safeExecute(getIpAddress, "Unknown"),
            safeExecute(getBrowserInfo, {}),
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

      // Remove loading indicator
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      
      // Re-enable inputs
      toggleInputs(false);

      // Send data back to chat
      window.voiceflow.chat.interact({
        type: "complete",
        payload: browserData
      });
    } catch (error) {
      console.error("BrowserData Extension Error:", error);
      
      // Make sure inputs are re-enabled even if there's an error
      toggleInputs(false);
      
      // Send error back to chat
      window.voiceflow.chat.interact({
        type: "complete",
        payload: { 
          error: true, 
          message: "Failed to collect browser data",
          collected_at: new Date().toISOString()
        }
      });
    }
  }
};

export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_dropdown" || trace.payload?.name === "ext_dropdown",
  render: ({ trace, element }) => {
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        // Disable/enable the entire input container for more comprehensive control
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
        }

        // Disable/enable specific elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
          voiceButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Voice input']"
          ),
          sendButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Send message']"
          ),
          attachmentButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Add attachment']"
          )
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = disable ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    const formContainer = document.createElement("form");
    formContainer.className = "_1ddzqsn7";
    formContainer.style.display = "inline-block";
    formContainer.style.maxWidth = "100%";
    formContainer.style.width = "auto";
    const dropdownOptions = trace.payload?.options || [];

    formContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
      
      ._1ddzqsn7 {
        display: inline-block !important;
        width: auto;
        max-width: 100%;
        min-width: 250px;
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
        box-sizing: border-box;
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
        box-sizing: border-box;
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
        box-sizing: border-box;
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
      
      @media screen and (max-width: 480px) {
        ._1ddzqsn7 {
          width: 100%;
          min-width: 0;
        }
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
      
      // Re-enable Voiceflow's inputs
      toggleInputs(false);
      
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
      
      // Make sure inputs are re-enabled when component is removed
      toggleInputs(false);
    };

    // Adjust size when the window is resized
    const resizeObserver = new ResizeObserver(() => {
      const parentWidth = element.offsetWidth;
      if (parentWidth > 0) {
        // Allow the form to size properly but not bigger than container
        formContainer.style.maxWidth = `${parentWidth}px`;
      }
    });
    
    resizeObserver.observe(element);

    element.appendChild(formContainer);
    
    // Disable inputs when component is mounted
    toggleInputs(true);

    return () => {
      cleanup();
      resizeObserver.disconnect();
    };
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

    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        // Disable/enable the entire input container for more comprehensive control
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
        }

        // Disable/enable specific elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
          voiceButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Voice input']"
          ),
          sendButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Send message']"
          ),
          attachmentButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Add attachment']"
          )
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = disable ? "#f5f5f5" : "";
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
    const cancelButton = multiSelectContainer.querySelector(".cancel-button");
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
      
      // Disable all inputs in the component
      checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = "0.7";
        checkbox.parentElement.style.cursor = "not-allowed";
      });
      
      submitButton.disabled = true;
      submitButton.style.opacity = "0.5";
      cancelButton.disabled = true;
      cancelButton.style.opacity = "0.5";
      
      // Re-enable chat inputs
      toggleInputs(false);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: { options: selectedOptions }
      });
    });

    cancelButton.addEventListener("click", () => {
      if (isSubmitted) return;
      
      // Disable component inputs
      checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = "0.7";
        checkbox.parentElement.style.cursor = "not-allowed";
      });
      
      submitButton.disabled = true;
      submitButton.style.opacity = "0.5";
      cancelButton.disabled = true;
      cancelButton.style.opacity = "0.5";
      
      // Re-enable chat inputs
      toggleInputs(false);
      
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { options: [] }
      });
    });

    // Cleanup function to ensure inputs are re-enabled
    const cleanup = () => {
      // Make sure inputs are re-enabled when component is removed
      toggleInputs(false);
    };

    element.innerHTML = '';
    element.appendChild(multiSelectContainer);
    
    // Disable inputs when component is mounted
    toggleInputs(true);

    // Return cleanup function
    return cleanup;
  },
};

export const RankOptionsExtension = {
  name: "RankOptions",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_rankoptions" || trace.payload?.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    const options = trace.payload?.options || [];

    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        // Disable/enable the entire input container for more comprehensive control
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
        }

        // Disable/enable specific elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
          voiceButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Voice input']"
          ),
          sendButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Send message']"
          ),
          attachmentButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Add attachment']"
          )
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = disable ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    // Hide any scroll indicators that might be present
    const hideScrollIndicators = () => {
      document.querySelectorAll('[class*="scroll-down"], [class*="scroll-button"]')
        .forEach(el => {
          el.style.display = 'none';
        });
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
          
          /* Remove any down arrows that might be added by the chat UI */
          [class*="scroll-down"],
          [class*="scroll-button"] {
            display: none !important;
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
        
        // Hide any scroll indicators
        hideScrollIndicators();
        
        // Re-enable chat inputs
        toggleInputs(false);

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
      
      // Return cleanup function
      return () => {
        if (sortableInstance) {
          sortableInstance.destroy();
        }
        // Make sure inputs are re-enabled when component is removed
        toggleInputs(false);
      };
    };

    // Hide any scroll indicators that might be present
    hideScrollIndicators();
    
    // Disable inputs when component is mounted
    toggleInputs(true);

    let cleanup = null;
    
    if (typeof Sortable === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => {
        cleanup = createForm();
      };
      script.onerror = () => {
        console.error('Failed to load Sortable.js');
        // Re-enable inputs if script fails to load
        toggleInputs(false);
      };
      document.head.appendChild(script);
    } else {
      cleanup = createForm();
    }

    // Return cleanup function
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      } else {
        // Fallback cleanup if createForm wasn't called
        toggleInputs(false);
      }
    };
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
      const toggleInputs = (disable) => {
        const chatDiv = document.getElementById("voiceflow-chat");
        if (chatDiv?.shadowRoot) {
          // Disable/enable the entire input container for more comprehensive control
          const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
          if (inputContainer) {
            inputContainer.style.opacity = disable ? "0.5" : "1";
            inputContainer.style.pointerEvents = disable ? "none" : "auto";
          }

          // Disable/enable specific elements
          const elements = {
            textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
            primaryButtons: chatDiv.shadowRoot.querySelectorAll(
              ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
            ),
            secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
              ".vfrc-chat-input--button.c-iSWgdS"
            ),
            voiceButtons: chatDiv.shadowRoot.querySelectorAll(
              "[aria-label='Voice input']"
            ),
            sendButtons: chatDiv.shadowRoot.querySelectorAll(
              "[aria-label='Send message']"
            ),
            attachmentButtons: chatDiv.shadowRoot.querySelectorAll(
              "[aria-label='Add attachment']"
            )
          };

          Object.values(elements).forEach(elementList => {
            elementList.forEach(el => {
              el.disabled = disable;
              el.style.pointerEvents = disable ? "none" : "auto";
              el.style.opacity = disable ? "0.5" : "1";
              if (el.tagName.toLowerCase() === "textarea") {
                el.style.backgroundColor = disable ? "#f5f5f5" : "";
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

      // Show optional visual indicator
      const showDelayIndicator = (duration) => {
        const chatContainer = document.querySelector('.vfrc-chat-messages');
        if (!chatContainer) return null;
        
        const indicatorElement = document.createElement('div');
        indicatorElement.className = 'delay-indicator';
        indicatorElement.innerHTML = `
          <style>
            .delay-indicator {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px 12px;
              margin: 8px 0;
              background: rgba(84, 88, 87, 0.05);
              border-radius: 8px;
              font-family: 'Montserrat', sans-serif;
              font-size: 13px;
              color: #72727a;
            }
            
            .delay-progress {
              width: 100%;
              height: 3px;
              background: #e2e8f0;
              border-radius: 2px;
              margin-top: 6px;
              overflow: hidden;
            }
            
            .delay-progress-bar {
              height: 100%;
              background: #72727a;
              width: 100%;
              transition: width linear;
              transform-origin: left;
            }
            
            @keyframes pulse {
              0% { opacity: 0.6; }
              50% { opacity: 1; }
              100% { opacity: 0.6; }
            }
            
            .delay-indicator-text {
              animation: pulse 2s infinite;
            }
          </style>
          <div>
            <div class="delay-indicator-text">Processing...</div>
            <div class="delay-progress">
              <div class="delay-progress-bar"></div>
            </div>
          </div>
        `;
        
        chatContainer.appendChild(indicatorElement);
        
        // Animate progress bar
        const progressBar = indicatorElement.querySelector('.delay-progress-bar');
        if (progressBar) {
          progressBar.style.width = '100%';
          setTimeout(() => {
            progressBar.style.width = '0%';
            progressBar.style.transition = `width ${duration}ms linear`;
          }, 50);
        }
        
        return indicatorElement;
      };

      // Initial cleanup and disable inputs
      hideScrollIndicators();
      toggleInputs(true);
      
      // Show delay indicator if delay is significant (over 1 second)
      const indicator = delay > 1000 ? showDelayIndicator(delay) : null;

      // Execute delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Remove indicator if it exists
      if (indicator) {
        indicator.remove();
      }
      
      // Cleanup and re-enable inputs
      hideScrollIndicators();
      toggleInputs(false);

      // Move to next block
      window.voiceflow.chat.interact({ 
        type: "complete",
        payload: { 
          delay: delay,
          completed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('DelayEffect Extension Error:', error);
      // Re-enable inputs even if there's an error
      toggleInputs(false);
      window.voiceflow.chat.interact({ 
        type: "complete",
        payload: {
          error: true,
          message: error.message
        }
      });
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
    // Extract and validate all parameters with enhanced defaults
    const config = {
      duration: parseInt(trace.payload?.duration) || 2000,
      completionDelay: parseInt(trace.payload?.completionDelay) || 800,
      text: trace.payload?.text || "Processing",
      completeText: trace.payload?.completeText || "Complete",
      primaryColor: trace.payload?.color || "#34D399",
      theme: trace.payload?.theme || "liquid",
      style: trace.payload?.style || "standard",
      showPercentage: trace.payload?.showPercentage !== false,
      interactive: trace.payload?.interactive || false,
      sound: trace.payload?.sound || false,
      vibration: trace.payload?.vibration || false,
      darkMode: trace.payload?.darkMode || false,
      fullWidth: trace.payload?.fullWidth !== false
    };
    
    // Calculate actual duration and create unique ID
    const actualDuration = config.duration - config.completionDelay;
    const instanceId = `transition-anim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Color utilities
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const darkenColor = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      const darkenComponent = (c) => Math.max(0, c - 20).toString(16).padStart(2, '0');
      
      return `#${darkenComponent(r)}${darkenComponent(g)}${darkenComponent(b)}`;
    };
    
    // Setup colors and theme-specific elements
    const baseColor = config.primaryColor;
    const secondaryColor = darkenColor(baseColor);
    const bgColor = config.darkMode ? hexToRgba('#1F2937', 0.8) : hexToRgba(baseColor, 0.1);
    const textColor = config.darkMode ? '#FFFFFF' : '#303235';
    
    // Theme configurations
    const themes = {
      liquid: {
        container: 'liquid-container',
        fill: 'liquid-fill',
        content: 'liquid-content',
        elements: `
          <div class="wave"></div>
          <div class="wave" style="animation-delay: -2s; animation-duration: 7s;"></div>
          <div class="bubbles">
            ${Array.from({length: 12}, (_, i) => `
              <div class="bubble" style="
                left: ${Math.random() * 100}%;
                width: ${4 + Math.random() * 4}px;
                height: ${4 + Math.random() * 4}px;
                animation-delay: ${Math.random() * 4}s;
              "></div>
            `).join('')}
          </div>
        `,
        styles: `
          .liquid-fill {
            background: linear-gradient(90deg, ${baseColor}, ${secondaryColor});
            animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
            overflow: hidden;
          }
          .liquid-fill::after {
            content: '';
            position: absolute;
            top: -50%; left: 0; width: 100%; height: 200%;
            background: repeating-linear-gradient(
              45deg, transparent, transparent 10px,
              rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px
            );
            animation: waterPattern 20s linear infinite;
          }
          .wave {
            position: absolute;
            top: -100%; right: 0; width: 200px; height: 200px;
            background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
            border-radius: 45%;
            animation: rotate 10s linear infinite;
          }
          .bubble {
            position: absolute;
            background: rgba(255,255,255,0.4);
            border-radius: 50%;
            animation: bubble 4s ease-in infinite;
          }
          @keyframes waterPattern {
            0% { transform: translateX(0) translateY(0); }
            100% { transform: translateX(-100px) translateY(-100px); }
          }
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes bubble {
            0% { transform: translateY(100%) scale(0); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(-100%) scale(1); opacity: 0; }
          }
        `
      },
      
      pulse: {
        container: 'pulse-container',
        fill: 'pulse-fill',
        content: 'pulse-content',
        elements: `
          <div class="pulse-rings">
            ${Array.from({length: 3}, (_, i) => `
              <div class="pulse-ring" style="animation-delay: ${i * 800}ms;"></div>
            `).join('')}
          </div>
        `,
        styles: `
          .pulse-fill {
            background: linear-gradient(90deg, ${baseColor}, ${secondaryColor});
            animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .pulse-rings {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            overflow: hidden;
          }
          .pulse-ring {
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            width: 40px; height: 40px;
            left: calc(100% * 0.2);
            top: 50%;
            transform: translate(-50%, -50%);
            animation: pulseRing 2.5s cubic-bezier(0.1, 0.25, 0.1, 1) infinite;
          }
          @keyframes pulseRing {
            0% { width: 5px; height: 5px; opacity: 0.8; }
            100% { width: 50px; height: 50px; opacity: 0; }
          }
        `
      },
      
      blocks: {
        container: 'blocks-container',
        fill: 'blocks-fill',
        content: 'blocks-content',
        elements: `
          <div class="blocks-grid">
            ${Array.from({length: 12}, (_, i) => `
              <div class="block" style="animation-delay: ${i * 100}ms;"></div>
            `).join('')}
          </div>
        `,
        styles: `
          .blocks-fill {
            background: linear-gradient(90deg, ${baseColor}, ${secondaryColor});
            animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .blocks-grid {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            padding: 4px;
            box-sizing: border-box;
            gap: 3px;
          }
          .block {
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            animation: blockPulse 1.5s ease-in-out infinite;
          }
          @keyframes blockPulse {
            0% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
            100% { opacity: 0.3; transform: scale(0.8); }
          }
        `
      },
      
      glow: {
        container: 'glow-container',
        fill: 'glow-fill',
        content: 'glow-content',
        elements: `
          <div class="glow-particles">
            ${Array.from({length: 15}, (_, i) => `
              <div class="glow-particle" style="
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                width: ${4 + Math.random() * 6}px;
                height: ${4 + Math.random() * 6}px;
                animation: floatParticle ${5 + Math.random() * 5}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
              "></div>
            `).join('')}
          </div>
        `,
        styles: `
          .glow-container {
            overflow: visible;
          }
          .glow-fill {
            background: linear-gradient(90deg, ${baseColor}, ${secondaryColor});
            animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
            box-shadow: 0 0 15px ${hexToRgba(baseColor, 0.6)};
          }
          .glow-particles {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            overflow: hidden;
          }
          .glow-particle {
            position: absolute;
            background: ${hexToRgba(baseColor, 0.6)};
            border-radius: 50%;
            filter: blur(1px);
          }
          @keyframes floatParticle {
            0% { transform: translate(0, 0); }
            25% { transform: translate(10px, 10px); }
            50% { transform: translate(0, 20px); }
            75% { transform: translate(-10px, 10px); }
            100% { transform: translate(0, 0); }
          }
        `
      },
      
      minimal: {
        container: 'minimal-container',
        fill: 'minimal-fill',
        content: 'minimal-content',
        elements: ``,
        styles: `
          .minimal-container {
            height: 8px;
            background: ${config.darkMode ? hexToRgba('#ffffff', 0.1) : hexToRgba('#000000', 0.05)};
          }
          .minimal-fill {
            background: ${baseColor};
            animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .minimal-content {
            position: absolute;
            right: 0;
            top: -24px;
            font-size: 12px;
          }
        `
      }
    };
    
    // Select theme
    const theme = themes[config.theme] || themes.liquid;
    
    // Sound effect function
    const playSound = (type) => {
      if (!config.sound) return;
      
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = type === 'complete' ? 830 : 680;
        gainNode.gain.value = 0.1;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + (type === 'complete' ? 0.1 : 0.04));
        
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, type === 'complete' ? 100 : 40);
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    };
    
    // Vibration function
    const vibrate = (pattern) => {
      if (config.vibration && 'vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch (e) {
          console.warn('Vibration API not supported');
        }
      }
    };
    
    // Create animation container
    const animationContainer = document.createElement("div");
    animationContainer.id = instanceId;
    animationContainer.className = "_1ddzqsn7";
    
    // Create style tag with all needed styles
    const styleContent = `
      /* Fix for container width */
      ._1ddzqsn7 {
        display: block !important;
        width: 100% !important;
      }
      
      /* Base styles */
      #${instanceId} {
        display: block;
        width: 100%;
        margin: 0;
        padding: 0;
        background: none;
        font-family: 'Montserrat', sans-serif;
        position: relative;
        z-index: 1;
      }
      
      .processing-container {
        position: relative;
        height: ${config.style === 'slim' ? '24px' : config.style === 'bold' ? '48px' : '36px'};
        width: 100%;
        border-radius: ${config.fullWidth ? '0' : '8px'};
        margin: ${config.fullWidth ? '0' : '12px 0'};
        padding: 0;
        background: ${bgColor};
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        ${config.interactive ? 'cursor: pointer;' : ''}
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      ${config.interactive ? `
        .processing-container:not(.completed):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }
        .processing-container:not(.completed):active {
          transform: translateY(0);
        }
        .processing-container.completed {
          cursor: default;
        }
      ` : ''}
      
      .processing-fill {
        position: absolute;
        top: 0;
        left: 0;
        width: 0%;
        height: 100%;
        border-radius: ${config.fullWidth ? '0' : '8px'};
      }
      
      @keyframes fillProgress-${instanceId} {
        0% { width: 0%; }
        100% { width: 100%; }
      }
      
      .processing-content {
        position: relative;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: ${theme.content === 'minimal-content' ? textColor : 'white'};
        font-size: ${config.style === 'slim' ? '12px' : config.style === 'bold' ? '16px' : '14px'};
        font-weight: ${config.style === 'bold' ? '600' : '500'};
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      
      .progress-percentage {
        margin-left: 8px;
        font-size: 0.9em;
        opacity: 0.9;
      }
      
      .bubbles {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      /* Success state */
      .success .processing-fill {
        background: linear-gradient(90deg, ${secondaryColor}, ${secondaryColor.replace(/[0-9a-f]{2}$/i, '57')}) !important;
        transition: background 0.3s ease;
      }
      
      /* Completion animation */
      .completion-effect {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: ${config.fullWidth ? '0' : '8px'};
        pointer-events: none;
        z-index: 4;
        opacity: 0;
      }
      
      .completion-effect.active {
        animation: completionPulse 0.6s ease-out;
      }
      
      @keyframes completionPulse {
        0% { opacity: 0.5; transform: scale(0.95); }
        50% { opacity: 0.7; transform: scale(1.02); }
        100% { opacity: 0; transform: scale(1.05); }
      }
      
      /* Checkmark */
      .checkmark {
        display: inline-block;
        transform: rotate(45deg);
        height: 12px;
        width: 6px;
        border-bottom: 2px solid ${theme.content === 'minimal-content' ? baseColor : 'white'};
        border-right: 2px solid ${theme.content === 'minimal-content' ? baseColor : 'white'};
        opacity: 0;
        margin-left: 4px;
        animation: checkmarkAnimation 0.5s ease forwards;
      }
      
      @keyframes checkmarkAnimation {
        0% { opacity: 0; transform: rotate(45deg) scale(0.8); }
        50% { opacity: 1; transform: rotate(45deg) scale(1.2); }
        100% { opacity: 1; transform: rotate(45deg) scale(1); }
      }
      
      /* Theme-specific styles */
      ${theme.styles}
      
      /* Hide scroll indicators */
      [class*="scroll-down"],
      [class*="scroll-button"] {
        display: none !important;
      }
    `;
    
    // Generate HTML
    animationContainer.innerHTML = `
      <style>${styleContent}</style>

      <div class="processing-container ${theme.container}" 
           ${config.interactive ? 'tabindex="0" role="button" aria-label="Click to complete processing"' : ''}>
        <div class="processing-fill ${theme.fill}">
          ${theme.elements}
        </div>
        <div class="processing-content ${theme.content}">
          <span class="processing-text">${config.text}</span>
          ${config.showPercentage ? '<span class="progress-percentage">0%</span>' : ''}
        </div>
        <div class="completion-effect"></div>
      </div>
    `;
    
    // DOM references
    const container = animationContainer.querySelector('.processing-container');
    const processingText = animationContainer.querySelector('.processing-text');
    const percentageElement = animationContainer.querySelector('.progress-percentage');
    const completionEffect = animationContainer.querySelector('.completion-effect');
    
    // Completion state flag to track if animation is done
    let isCompleted = false;
    
    // Update percentage if enabled
    let animationFrame;
    let startTime = null;
    
    const updatePercentage = (timestamp) => {
      if (!startTime) startTime = timestamp;
      if (!percentageElement || isCompleted) return;
      
      const elapsed = timestamp - startTime;
      const progress = Math.min(Math.floor((elapsed / actualDuration) * 100), 99);
      
      percentageElement.textContent = `${progress}%`;
      
      if (progress < 99 && !isCompleted) {
        animationFrame = requestAnimationFrame(updatePercentage);
      }
    };
    
    if (config.showPercentage) {
      animationFrame = requestAnimationFrame(updatePercentage);
    }
    
    // Toggle inputs function
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        // Disable/enable the entire input container
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
          inputContainer.style.transition = "opacity 0.3s ease";
        }

        // Disable/enable specific elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
          voiceButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Voice input']"
          ),
          sendButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Send message']"
          ),
          attachmentButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Add attachment']"
          )
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            el.style.transition = "opacity 0.3s ease";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = disable ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    // Hide scroll indicators
    const hideScrollIndicators = () => {
      document.querySelectorAll('[class*="scroll-down"], [class*="scroll-button"]')
        .forEach(el => {
          el.style.display = 'none';
        });
    };
    
    // Event handler function for click/keyboard
    const handleInteraction = (event) => {
      // Prevent executing if already completed
      if (isCompleted) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      
      completeAnimation(true);
      playSound('click');
      return false;
    };
    
    // Add event listeners if interactive
    if (config.interactive) {
      container.addEventListener('click', handleInteraction);
      container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInteraction(e);
        }
      });
    }
    
    // Completion function
    const completeAnimation = (userTriggered = false) => {
      // Set completed state
      isCompleted = true;
      container.classList.add('completed');
      
      // Clear any timers
      if (animationContainer.dataset.completionTimer) {
        clearTimeout(parseInt(animationContainer.dataset.completionTimer));
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      
      // Update UI
      container.classList.add('success');
      
      if (percentageElement) {
        percentageElement.textContent = '100%';
      }
      
      // Show completion text
      processingText.textContent = config.completeText;
      
      // Add checkmark
      setTimeout(() => {
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        processingText.parentNode.appendChild(checkmark);
      }, 100);
      
      // Add completion effect
      completionEffect.style.background = `radial-gradient(circle, ${hexToRgba(baseColor, 0.2)} 0%, transparent 70%)`;
      completionEffect.classList.add('active');
      
      // Haptic feedback
      vibrate(userTriggered ? [30] : [50, 50, 80]);
      
      // Sound effect
      playSound('complete');
      
      // Cleanup and continue
      setTimeout(() => {
        cleanup();
        window.voiceflow.chat.interact({ 
          type: "complete",
          payload: {
            completed: true,
            duration: userTriggered ? Date.now() - startTime : config.duration,
            userTriggered: userTriggered,
            timestamp: Date.now()
          }
        });
      }, config.completionDelay);
    };
    
    // Initial setup
    hideScrollIndicators();
    toggleInputs(true);
    element.appendChild(animationContainer);

    // Set up cleanup function
    const cleanup = () => {
      // Remove event listeners to prevent further clicks
      if (config.interactive) {
        container.removeEventListener('click', handleInteraction);
      }
      
      toggleInputs(false);
      hideScrollIndicators();
    };

    // Schedule animation completion
    const completionTimer = setTimeout(() => {
      completeAnimation();
    }, actualDuration);
    
    // Store timer for cleanup
    animationContainer.dataset.completionTimer = completionTimer;

    // Return cleanup function
    return () => {
      if (animationContainer.dataset.completionTimer) {
        clearTimeout(parseInt(animationContainer.dataset.completionTimer));
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (config.interactive) {
        container.removeEventListener('click', handleInteraction);
      }
      cleanup();
    };
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
    const customColor = trace.payload?.color || "#635bff"; // Stripe purple by default
    const customTitle = trace.payload?.title || "Complete your payment to proceed";

    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        // Disable/enable the entire input container for more comprehensive control
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
        }

        // Disable/enable specific elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          primaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          secondaryButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
          voiceButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Voice input']"
          ),
          sendButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Send message']"
          ),
          attachmentButtons: chatDiv.shadowRoot.querySelectorAll(
            "[aria-label='Add attachment']"
          )
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = disable ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    // Hide any scroll indicators that might be present
    const hideScrollIndicators = () => {
      document.querySelectorAll('[class*="scroll-down"], [class*="scroll-button"]')
        .forEach(el => {
          el.style.display = 'none';
        });
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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .payment-title {
          font-size: 14px;
          color: #303235;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .button-group {
          display: grid;
          gap: 8px;
          margin-top: ${autoRedirect ? '12px' : '0'};
        }

        .payment-link {
          text-decoration: none;
          display: block;
          width: 100%;
        }

        .payment-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: ${customColor};
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .payment-button:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .payment-button:active {
          transform: translateY(0);
        }

        .later-button {
          background: transparent;
          color: #72727a;
          border: 1px solid rgba(114, 114, 122, 0.2);
        }

        .later-button:hover {
          background: rgba(114, 114, 122, 0.1);
          box-shadow: none;
        }

        .redirect-countdown {
          margin-bottom: 12px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
          font-size: 13px;
          color: #4a5568;
          text-align: center;
          animation: fadeIn 0.3s ease;
        }

        .countdown-number {
          font-weight: 600;
          color: ${customColor};
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
          background: ${customColor};
          width: 100%;
          transition: width linear;
        }

        .backup-link {
          margin-top: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 13px;
          color: #4a5568;
          text-align: center;
          display: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .backup-link.visible {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 1;
          animation: fadeIn 0.5s ease;
        }

        .backup-link svg {
          width: 16px;
          height: 16px;
          color: ${customColor};
        }

        .backup-link a {
          color: ${customColor};
          text-decoration: none;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .backup-link a:hover {
          text-decoration: underline;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        .payment-status {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px;
          border-radius: 6px;
          font-size: 13px;
          color: #4a5568;
          animation: fadeIn 0.3s ease;
        }
        
        /* Remove any down arrows that might be added by the chat UI */
        [class*="scroll-down"],
        [class*="scroll-button"] {
          display: none !important;
        }
        
        .secure-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #72727a;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .secure-badge svg {
          width: 14px;
          height: 14px;
          color: #72727a;
        }
      </style>

      <div class="payment-container">
        <div class="payment-title">${customTitle}</div>
        
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
          <a href="${paymentUrl}" target="_blank" rel="noopener noreferrer" class="payment-link" id="stripePaymentBtn">
            <div class="payment-button">
              <svg class="payment-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/>
                <path d="M4 8h16M8 14h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              ${buttonText}
            </div>
          </a>
          <button class="payment-button later-button" id="payLaterBtn">
            ${laterButtonText}
          </button>
        </div>

        <div class="backup-link" id="backupLink">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          <span>Payment page not opening? <a href="${paymentUrl}" target="_blank" rel="noopener noreferrer">Click here to open it</a></span>
        </div>
        
        <div class="secure-badge">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Secure payment powered by Stripe</span>
        </div>
      </div>
    `;

    const handlePayment = (e) => {
      const paymentLink = paymentContainer.querySelector('#stripePaymentBtn');
      const laterButton = paymentContainer.querySelector('#payLaterBtn');
      const countdown = paymentContainer.querySelector('.redirect-countdown');
      const backupLink = paymentContainer.querySelector('#backupLink');
      
      // Disable buttons
      paymentLink.style.pointerEvents = 'none';
      paymentLink.style.opacity = '0.7';
      laterButton.style.display = 'none';
      
      if (countdown) {
        countdown.style.display = 'none';
      }

      // Show backup link after a short delay
      setTimeout(() => {
        backupLink.classList.add('visible');
      }, 1500);

      // Hide scroll indicators
      hideScrollIndicators();

      // Re-enable chat input after a short delay
      setTimeout(() => {
        toggleInputs(false);
      }, 500);

      // Complete the interaction
      setTimeout(() => {
        window.voiceflow.chat.interact({
          type: "complete",
          payload: { 
            status: "payment_initiated",
            paymentUrl,
            timestamp: new Date().toISOString()
          }
        });
      }, 1000);
    };

    const handlePayLater = () => {
      // Disable buttons to prevent multiple clicks
      const paymentLink = paymentContainer.querySelector('#stripePaymentBtn');
      const laterButton = paymentContainer.querySelector('#payLaterBtn');
      
      paymentLink.style.pointerEvents = 'none';
      paymentLink.style.opacity = '0.7';
      laterButton.disabled = true;
      laterButton.style.opacity = '0.7';
      laterButton.style.pointerEvents = 'none';
      
      // Hide scroll indicators
      hideScrollIndicators();
      
      // Re-enable chat input before completing
      toggleInputs(false);
      
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { 
          status: "payment_delayed",
          timestamp: new Date().toISOString()
        }
      });
    };

    // Disable inputs immediately when extension starts
    toggleInputs(true);
    
    // Hide scroll indicators
    hideScrollIndicators();

    const paymentLink = paymentContainer.querySelector('#stripePaymentBtn');
    const laterButton = paymentContainer.querySelector('#payLaterBtn');
    
    paymentLink.addEventListener('click', handlePayment);
    laterButton.addEventListener('click', handlePayLater);

    // Handle auto-redirect
    let countdownInterval = null;
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
      countdownInterval = setInterval(() => {
        timeLeft -= 1;
        if (countdownElement) {
          countdownElement.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          paymentLink.click();
        }
      }, 1000);

      // Allow manual click during countdown
      paymentLink.addEventListener('click', () => {
        if (countdownInterval) {
          clearInterval(countdownInterval);
        }
      });
    }

    element.appendChild(paymentContainer);
    
    // Return cleanup function
    return () => {
      // Clear any intervals
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      
      // Re-enable inputs if component is removed
      toggleInputs(false);
      
      // Hide scroll indicators
      hideScrollIndicators();
    };
  },
};

export const CalendarDatePickerExtension = {
  name: "CalendarDatePicker",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_calendarDatePicker" || 
    trace.payload?.name === "ext_calendarDatePicker",
  render: ({ trace, element }) => {
    // Configuration with defaults
    const config = {
      title: trace.payload?.title || "Select your birthdate",
      confirmText: trace.payload?.confirmText || "Confirm",
      cancelText: trace.payload?.cancelText || "Cancel",
      primaryColor: trace.payload?.color || "#4F46E5", // Indigo default
      secondaryColor: trace.payload?.secondaryColor || "#E0E7FF", // Light indigo
      maxYear: trace.payload?.maxYear || new Date().getFullYear(),
      minYear: trace.payload?.minYear || 1900,
      ageLabel: trace.payload?.ageLabel || "Age", 
      darkMode: trace.payload?.darkMode || false
    };
    
    // Create a unique ID for this instance
    const instanceId = `calendar-${Date.now()}`;
    
    // Helper functions
    const calculateAge = (birthdate) => {
      const today = new Date();
      let age = today.getFullYear() - birthdate.getFullYear();
      const monthDiff = today.getMonth() - birthdate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
      }
      
      return age;
    };
    
    const formatDate = (year, month, day) => {
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    };
    
    // Color utilities
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Set color scheme based on dark mode preference
    const colors = {
      background: config.darkMode ? '#1E293B' : '#FFFFFF',
      surface: config.darkMode ? '#334155' : '#F8FAFC',
      text: config.darkMode ? '#F1F5F9' : '#1E293B',
      textSecondary: config.darkMode ? '#94A3B8' : '#64748B',
      border: config.darkMode ? '#475569' : '#E2E8F0',
      primary: config.primaryColor,
      primaryLight: hexToRgba(config.primaryColor, 0.15),
      hover: config.darkMode ? '#475569' : '#F1F5F9'
    };
    
    // Style
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      .calendar-container {
        font-family: 'Inter', system-ui, sans-serif;
        background: ${colors.background};
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, ${config.darkMode ? 0.4 : 0.08});
        overflow: hidden;
        width: 100%;
        max-width: 350px;
        margin: 0 auto;
        transition: all 0.3s ease;
        border: 1px solid ${colors.border};
      }
      
      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: ${colors.surface};
      }
      
      .calendar-title {
        font-size: 16px;
        font-weight: 600;
        color: ${colors.text};
        letter-spacing: -0.01em;
      }
      
      .month-nav {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .month-nav-text {
        font-size: 15px;
        font-weight: 500;
        color: ${colors.text};
        min-width: 110px;
        text-align: center;
      }
      
      .month-nav button {
        background: ${colors.hover};
        border: none;
        cursor: pointer;
        color: ${colors.textSecondary};
        border-radius: 8px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .month-nav button:hover {
        background: ${hexToRgba(config.primaryColor, 0.1)};
        color: ${config.primaryColor};
      }
      
      .month-nav button:active {
        transform: scale(0.95);
      }
      
      .calendar-body {
        padding: 12px 16px 16px;
      }
      
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .weekday {
        text-align: center;
        font-size: 12px;
        font-weight: 500;
        color: ${colors.textSecondary};
        padding: 8px 0;
        text-transform: uppercase;
      }
      
      .calendar-day {
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 10px;
        font-size: 14px;
        color: ${colors.text};
        position: relative;
        transition: all 0.15s ease;
        font-weight: 400;
      }
      
      .calendar-day:hover:not(.outside-month):not(.selected) {
        background: ${colors.hover};
      }
      
      .calendar-day.outside-month {
        color: ${colors.textSecondary};
        opacity: 0.5;
      }
      
      .calendar-day.today {
        font-weight: 600;
        border: 1.5px solid ${config.primaryColor};
      }
      
      .calendar-day.selected {
        background-color: ${config.primaryColor};
        color: white;
        font-weight: 500;
        box-shadow: 0 2px 8px ${hexToRgba(config.primaryColor, 0.4)};
      }
      
      .calendar-day.selected:hover {
        background-color: ${config.primaryColor};
        opacity: 0.9;
      }
      
      .calendar-footer {
        padding: 0 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      
      .year-select-container {
        position: relative;
      }
      
      .year-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid ${colors.border};
        border-radius: 10px;
        font-size: 14px;
        background: ${colors.surface};
        color: ${colors.text};
        font-family: 'Inter', system-ui, sans-serif;
        cursor: pointer;
        appearance: none;
        transition: all 0.2s;
      }
      
      .year-select:focus {
        outline: none;
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 2px ${hexToRgba(config.primaryColor, 0.2)};
      }
      
      .year-select-container::after {
        content: '';
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 10px;
        height: 6px;
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23${config.primaryColor.substring(1)}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
        background-repeat: no-repeat;
        pointer-events: none;
      }
      
      .status-text {
        text-align: center;
        padding: 12px;
        background: ${colors.surface};
        border-radius: 10px;
        font-size: 14px;
        color: ${colors.text};
        border: 1px solid ${colors.border};
        transition: all 0.3s ease;
      }
      
      .error-text {
        text-align: center;
        padding: 12px;
        background: ${hexToRgba("#EF4444", 0.1)};
        color: #EF4444;
        border-radius: 10px;
        font-size: 14px;
        margin-bottom: 4px;
        border: 1px solid rgba(239, 68, 68, 0.2);
        display: none;
        animation: fadeIn 0.3s ease;
      }
      
      .age-display {
        text-align: center;
        padding: 12px;
        background: ${hexToRgba(config.primaryColor, 0.1)};
        color: ${config.primaryColor};
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        display: none;
        animation: fadeIn 0.3s ease;
        border: 1px solid ${hexToRgba(config.primaryColor, 0.15)};
      }
      
      .buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 4px;
      }
      
      .btn {
        padding: 12px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
        font-family: 'Inter', system-ui, sans-serif;
        transition: all 0.2s ease;
      }
      
      .btn-cancel {
        background: ${colors.surface};
        color: ${colors.textSecondary};
        border: 1px solid ${colors.border};
      }
      
      .btn-cancel:hover {
        background: ${config.darkMode ? '#475569' : '#E2E8F0'};
      }
      
      .btn-confirm {
        background: ${config.primaryColor};
        color: white;
        box-shadow: 0 2px 4px ${hexToRgba(config.primaryColor, 0.4)};
      }
      
      .btn-confirm:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px ${hexToRgba(config.primaryColor, 0.5)};
      }
      
      .btn-confirm:active {
        transform: translateY(0);
      }
      
      .btn-confirm:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .selected-animation {
        animation: pulse 0.4s ease;
      }
    `;
    
    // Create the container element
    const container = document.createElement('div');
    container.id = instanceId;
    
    // Set initial state
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    let selectedDate = null;
    
    // Create the HTML structure
    container.innerHTML = `
      <style>${styles}</style>
      <div class="calendar-container">
        <div class="calendar-header">
          <div class="calendar-title">${config.title}</div>
          <div class="month-nav">
            <button class="prev-month" aria-label="Previous month">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
            <span class="month-nav-text"></span>
            <button class="next-month" aria-label="Next month">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="calendar-body">
          <div class="calendar-grid">
            <!-- Will be populated dynamically -->
          </div>
          
          <div class="year-select-container">
            <select id="year-select" class="year-select">
              ${Array.from({length: config.maxYear - config.minYear + 1}, (_, i) => config.maxYear - i)
                .map(year => `<option value="${year}">${year}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        
        <div class="calendar-footer">
          <div class="status-text">No date selected</div>
          <div class="error-text">Please select a date</div>
          <div class="age-display"></div>
          <div class="buttons">
            <button class="btn btn-cancel">${config.cancelText}</button>
            <button class="btn btn-confirm">${config.confirmText}</button>
          </div>
        </div>
      </div>
    `;
    
    // Append to the element
    element.appendChild(container);
    
    // Get DOM elements
    const calendarGrid = container.querySelector('.calendar-grid');
    const currentMonthDisplay = container.querySelector('.month-nav-text');
    const prevMonthButton = container.querySelector('.prev-month');
    const nextMonthButton = container.querySelector('.next-month');
    const yearSelect = container.querySelector('#year-select');
    const statusText = container.querySelector('.status-text');
    const errorText = container.querySelector('.error-text');
    const ageDisplay = container.querySelector('.age-display');
    const cancelButton = container.querySelector('.btn-cancel');
    const confirmButton = container.querySelector('.btn-confirm');
    
    // Get month name
    const getMonthName = (month) => {
      return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
    };
    
    // Render the calendar
    const renderCalendar = () => {
      // Update current month display
      currentMonthDisplay.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
      yearSelect.value = currentYear;
      
      // Clear the grid
      calendarGrid.innerHTML = '';
      
      // Add weekday headers
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'weekday';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
      });
      
      // Get first day of the month
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
      
      // Get number of days in current month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Get number of days in previous month
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      
      // Add days from previous month
      for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day outside-month';
        dayElement.textContent = day;
        
        // Calculate previous month and year
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
          prevMonth = 11;
          prevYear = currentYear - 1;
        }
        
        dayElement.addEventListener('click', () => {
          selectDate(prevYear, prevMonth, day);
          currentMonth = prevMonth;
          currentYear = prevYear;
          renderCalendar();
        });
        
        calendarGrid.appendChild(dayElement);
      }
      
      // Add days for current month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if this is today
        if (currentYear === today.getFullYear() && 
            currentMonth === today.getMonth() && 
            day === today.getDate()) {
          dayElement.classList.add('today');
        }
        
        // Check if this is the selected date
        if (selectedDate && 
            selectedDate.getDate() === day && 
            selectedDate.getMonth() === currentMonth && 
            selectedDate.getFullYear() === currentYear) {
          dayElement.classList.add('selected');
        }
        
        dayElement.addEventListener('click', () => {
          selectDate(currentYear, currentMonth, day);
          dayElement.classList.add('selected-animation');
        });
        
        calendarGrid.appendChild(dayElement);
      }
      
      // Calculate how many days to show from next month
      const totalDaysShown = firstDayOfMonth + daysInMonth;
      const remainingCells = totalDaysShown % 7 === 0 ? 0 : 7 - (totalDaysShown % 7);
      
      // Add days from next month
      for (let day = 1; day <= remainingCells; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day outside-month';
        dayElement.textContent = day;
        
        // Calculate next month and year
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear = currentYear + 1;
        }
        
        dayElement.addEventListener('click', () => {
          selectDate(nextYear, nextMonth, day);
          currentMonth = nextMonth;
          currentYear = nextYear;
          renderCalendar();
        });
        
        calendarGrid.appendChild(dayElement);
      }
    };
    
    // Function to select a date
    const selectDate = (year, month, day) => {
      // Create the date object
      selectedDate = new Date(year, month, day);
      
      // Calculate age
      const age = calculateAge(selectedDate);
      
      // Update status text
      statusText.textContent = formatDate(year, month + 1, day);
      statusText.style.borderColor = hexToRgba(config.primaryColor, 0.3);
      statusText.style.background = hexToRgba(config.primaryColor, 0.05);
      
      // Update age display
      ageDisplay.textContent = `${config.ageLabel}: ${age} years`;
      ageDisplay.style.display = 'block';
      
      // Hide error if shown
      errorText.style.display = 'none';
      
      // Re-render calendar to show selection
      renderCalendar();
    };
    
    // Initial render
    renderCalendar();
    
    // Event listeners
    prevMonthButton.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
    
    nextMonthButton.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
    
    yearSelect.addEventListener('change', (e) => {
      currentYear = parseInt(e.target.value);
      renderCalendar();
    });
    
    cancelButton.addEventListener('click', () => {
      // Send cancel event to Voiceflow
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { 
          cancelled: true,
          timestamp: Date.now()
        }
      });
    });
    
    confirmButton.addEventListener('click', () => {
      if (!selectedDate) {
        // Show error message
        errorText.style.display = 'block';
        errorText.style.animation = 'none';
        setTimeout(() => {
          errorText.style.animation = 'fadeIn 0.3s ease';
        }, 10);
        return;
      }
      
      // Format the date
      const month = selectedDate.getMonth() + 1;
      const day = selectedDate.getDate();
      const year = selectedDate.getFullYear();
      const formattedDate = formatDate(year, month, day);
      
      // Calculate age
      const age = calculateAge(selectedDate);
      
      // Send data to Voiceflow
      window.voiceflow.chat.interact({
        type: "complete",
        payload: {
          date: formattedDate,
          age: age,
          year: year,
          month: month,
          day: day,
          timestamp: Date.now()
        }
      });
    });
    
    // Disable chat input while calendar is open
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
          inputContainer.style.transition = "opacity 0.3s ease";
        }
      }
    };
    
    // Disable inputs
    toggleInputs(true);
    
    // Return cleanup function
    return () => {
      toggleInputs(false);
    };
  }
};
