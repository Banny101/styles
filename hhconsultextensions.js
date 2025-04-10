export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    // Improved function that disables inputs while preserving scrolling
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) return;
      
      // Ensure message container remains scrollable
      const messageContainer = chatDiv.shadowRoot.querySelector(".vfrc-chat-messages");
      if (messageContainer) {
        // Always keep messages scrollable
        messageContainer.style.pointerEvents = "auto";
        messageContainer.style.overflow = "auto";
      }
      
      // Disable/enable the input container
      const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
      if (inputContainer) {
        inputContainer.style.opacity = disable ? "0.5" : "1";
        inputContainer.style.pointerEvents = disable ? "none" : "auto";
        inputContainer.style.transition = "opacity 0.3s ease";
      }

      // Disable/enable specific input elements
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
    // Configuration options
    const primaryColor = trace.payload?.color || "#545857";
    const buttonText = trace.payload?.buttonText || "Submit";
    const placeholder = trace.payload?.placeholder || "Search or select...";
    const maxHeight = trace.payload?.maxHeight || 200; // Max height of dropdown options
    const darkMode = trace.payload?.darkMode || false;
    
    // Color utility functions
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Lighten/darken a hex color
    const adjustColor = (hex, percent) => {
      const num = parseInt(hex.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      
      return '#' + (
        0x1000000 + 
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      ).toString(16).slice(1);
    };
    
    // Set colors based on mode
    const colors = {
      primary: primaryColor,
      hover: adjustColor(primaryColor, 10),
      border: hexToRgba(primaryColor, 0.2),
      focusShadow: hexToRgba(primaryColor, 0.1),
      hoverBg: hexToRgba(primaryColor, 0.08),
      background: darkMode ? "#1E293B" : "white",
      surface: darkMode ? "#334155" : "white",
      text: darkMode ? "#F1F5F9" : primaryColor,
      textSecondary: darkMode ? "#94A3B8" : hexToRgba(primaryColor, 0.7),
      inputBg: darkMode ? "#475569" : "white",
      scrollThumb: hexToRgba(primaryColor, 0.4),
      scrollTrack: darkMode ? "#334155" : "#f1f1f1"
    };
    
    // Improved input disabling that preserves scrolling
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) return;
      
      // FIRST: Ensure all chat message containers remain scrollable
      const messageContainer = chatDiv.shadowRoot.querySelector(".vfrc-chat-messages");
      if (messageContainer) {
        messageContainer.style.pointerEvents = "auto";
        messageContainer.style.overflow = "auto"; 
        messageContainer.style.touchAction = "auto"; // Important for mobile
      }
      
      // Also ensure any parent scrollable containers remain functional
      const scrollContainers = chatDiv.shadowRoot.querySelectorAll(".vfrc-chat-container, .vfrc-chat");
      scrollContainers.forEach(container => {
        if (container) {
          container.style.pointerEvents = "auto";
          container.style.overflow = "auto";
          container.style.touchAction = "auto";
        }
      });
      
      // Only disable the input controls
      const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
      if (inputContainer) {
        inputContainer.style.opacity = disable ? "0.5" : "1";
        inputContainer.style.pointerEvents = disable ? "none" : "auto";
        inputContainer.style.transition = "opacity 0.3s ease";
      }

      // Disable specific input elements
      const elements = {
        textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
        buttons: chatDiv.shadowRoot.querySelectorAll("button"),
        inputs: chatDiv.shadowRoot.querySelectorAll("input")
      };

      Object.values(elements).forEach(elementList => {
        elementList.forEach(el => {
          // Don't disable elements outside the input container
          if (inputContainer && inputContainer.contains(el)) {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
          }
        });
      });
    };

    const formContainer = document.createElement("form");
    formContainer.className = "dropdown-ext-form";
    formContainer.style.display = "inline-block";
    formContainer.style.maxWidth = "100%";
    formContainer.style.width = "auto";
    const dropdownOptions = trace.payload?.options || [];

    formContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      
      .dropdown-ext-form {
        display: inline-block !important;
        width: auto;
        max-width: 100%;
        min-width: 250px;
        font-family: 'Inter', system-ui, sans-serif;
      }
      
      .dropdown-wrapper {
        width: 100%;
      }
      
      .dropdown-extension-container {
        position: relative;
        width: 100%;
        margin-bottom: 8px;
      }
      
      .dropdown-extension-input[type="text"] {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid ${colors.border};
        border-radius: 8px;
        background: ${colors.inputBg};
        color: ${colors.text};
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
        transition: all 0.2s ease;
        cursor: pointer;
        margin: 0;
        box-sizing: border-box;
        -webkit-appearance: none;
      }

      .dropdown-extension-input[type="text"]:focus {
        outline: none;
        border-color: ${colors.primary};
        box-shadow: 0 0 0 2px ${colors.focusShadow};
      }

      .dropdown-extension-input[type="text"]::placeholder {
        color: ${colors.textSecondary};
        opacity: 0.7;
      }

      .dropdown-extension-input[type="text"]:disabled {
        background-color: ${darkMode ? "#1E293B" : "#f5f5f5"};
        cursor: not-allowed;
        opacity: 0.7;
      }

      .dropdown-extension-options {
        position: absolute;
        bottom: calc(100% + 4px);
        left: 0;
        right: 0;
        width: 100%;
        max-height: ${maxHeight}px;
        overflow-y: auto;
        overflow-x: hidden;
        background: ${colors.surface};
        border-radius: 8px;
        border: 1px solid ${colors.border};
        box-shadow: 0 -2px 10px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.1});
        display: none;
        z-index: 1000;
        box-sizing: border-box;
        scrollbar-width: thin;
        scrollbar-color: ${colors.scrollThumb} ${colors.scrollTrack};
        -webkit-overflow-scrolling: touch; /* For smooth scrolling on iOS */
      }
      
      /* Scrollbar styling */
      .dropdown-extension-options::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      .dropdown-extension-options::-webkit-scrollbar-track {
        background: ${colors.scrollTrack};
        border-radius: 10px;
      }
      
      .dropdown-extension-options::-webkit-scrollbar-thumb {
        background: ${colors.scrollThumb};
        border-radius: 10px;
      }
      
      .dropdown-extension-options::-webkit-scrollbar-thumb:hover {
        background: ${colors.primary};
      }

      .dropdown-extension-options div {
        padding: 10px 14px;
        font-size: 14px;
        color: ${colors.text};
        cursor: pointer;
        transition: background-color 0.15s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-bottom: 1px solid ${hexToRgba(colors.border, 0.5)};
      }
      
      .dropdown-extension-options div:last-child {
        border-bottom: none;
      }

      .dropdown-extension-options div:hover,
      .dropdown-extension-options div.highlighted {
        background-color: ${colors.hoverBg};
      }

      .dropdown-extension-submit {
        width: 100%;
        padding: 10px 16px;
        background-color: ${colors.primary};
        color: white;
        border: none;
        border-radius: 8px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
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
        background-color: ${colors.hover};
        transform: translateY(-1px);
      }
      
      .dropdown-extension-submit.enabled:active {
        transform: translateY(0);
      }

      .dropdown-extension-invalid {
        border-color: #ff4444 !important;
      }

      .dropdown-extension-input[type="text"] {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(colors.text)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }
      
      /* Animation classes */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .dropdown-fade-in {
        animation: fadeIn 0.2s ease forwards;
      }
      
      /* Mobile adjustments */
      @media screen and (max-width: 480px) {
        .dropdown-ext-form {
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
          placeholder="${placeholder}" 
          autocomplete="off"
          spellcheck="false"
          aria-label="Dropdown search field"
        >
        <div class="dropdown-extension-options" role="listbox" aria-label="Dropdown options">
          ${dropdownOptions
            .map((option) => `<div data-value="${option}" role="option">${option}</div>`)
            .join("")}
        </div>
        <input 
          type="hidden" 
          class="dropdown-extension-input dropdown-extension-hidden" 
          name="dropdown" 
          required
        >
      </div>
      <button type="submit" class="dropdown-extension-submit">${buttonText}</button>
    </div>
  `;  

    const dropdownSearch = formContainer.querySelector(".dropdown-extension-search");
    const dropdownOptionsDiv = formContainer.querySelector(".dropdown-extension-options");
    const hiddenDropdownInput = formContainer.querySelector(".dropdown-extension-hidden");
    const submitButton = formContainer.querySelector(".dropdown-extension-submit");
    let highlightedIndex = -1;
    let isDropdownVisible = false;

    const enableSubmitButton = () => {
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      submitButton.classList.toggle("enabled", isValidOption);
    };

    const showDropup = (e) => {
      if (e) e.stopPropagation();
      if (isDropdownVisible) return;
      
      isDropdownVisible = true;
      dropdownOptionsDiv.style.display = "block";
      dropdownOptionsDiv.classList.add("dropdown-fade-in");
      
      // Scroll to selected option if exists
      const selectedOption = dropdownOptionsDiv.querySelector(`div[data-value="${hiddenDropdownInput.value}"]`);
      if (selectedOption) {
        highlightedIndex = Array.from(dropdownOptionsDiv.querySelectorAll("div")).indexOf(selectedOption);
        updateHighlight();
        setTimeout(() => {
          selectedOption.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 50);
      }
    };

    const hideDropup = () => {
      isDropdownVisible = false;
      dropdownOptionsDiv.style.display = "none";
      highlightedIndex = -1;
      updateHighlight();
    };

    const updateHighlight = () => {
      const options = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
      options.forEach((option, index) => {
        option.classList.toggle("highlighted", index === highlightedIndex);
        option.setAttribute("aria-selected", index === highlightedIndex ? "true" : "false");
      });
      
      // Scroll highlighted option into view
      if (highlightedIndex >= 0 && options[highlightedIndex]) {
        options[highlightedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
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
      let hasVisibleOptions = false;
      
      options.forEach((option) => {
        const text = option.textContent.toLowerCase();
        const isVisible = text.includes(filter);
        option.style.display = isVisible ? "" : "none";
        if (isVisible) hasVisibleOptions = true;
      });
      
      // Only show dropdown if there are matching options
      if (hasVisibleOptions) {
        showDropup();
      } else {
        hideDropup();
      }
      
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
          if (!isDropdownVisible) {
            showDropup();
          } else if (visibleOptions.length > 0) {
            highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
            updateHighlight();
          }
          break;
          
        case "ArrowUp":
          e.preventDefault();
          if (highlightedIndex > 0) {
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight();
          }
          break;
          
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
            const selectedValue = visibleOptions[highlightedIndex].getAttribute("data-value");
            handleOptionSelection(selectedValue);
          } else if (submitButton.classList.contains("enabled")) {
            submitButton.click(); // Submit form if valid
          }
          break;
          
        case "Escape":
          e.preventDefault();
          hideDropup();
          dropdownSearch.blur();
          break;
          
        case "Tab":
          hideDropup();
          break;
      }
    };

    // Prevent form submission on enter key while typing
    formContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && document.activeElement === dropdownSearch) {
        e.preventDefault();
      }
    });

    // Add event listeners
    dropdownSearch.addEventListener("focus", showDropup);
    dropdownSearch.addEventListener("click", showDropup);
    dropdownSearch.addEventListener("input", handleInput);
    dropdownSearch.addEventListener("keydown", handleKeyNavigation);

    // Make options dropdown properly scrollable
    dropdownOptionsDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.tagName === "DIV") {
        const selectedValue = e.target.getAttribute("data-value");
        handleOptionSelection(selectedValue);
      }
    });
    
    // Handle mousewheel/touch scrolling properly
    dropdownOptionsDiv.addEventListener("wheel", (e) => {
      // Only stop propagation if we're at the boundary and would scroll the page
      const { scrollTop, scrollHeight, clientHeight } = dropdownOptionsDiv;
      const isAtTop = scrollTop === 0 && e.deltaY < 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
      
      if (isAtTop || isAtBottom) {
        e.stopPropagation();
      } else {
        // Let the dropdown scroll internally
        e.stopPropagation();
      }
    });

    // Close dropdown when clicking outside
    const handleOutsideClick = (e) => {
      if (!dropdownSearch.contains(e.target) && !dropdownOptionsDiv.contains(e.target)) {
        hideDropup();
      }
    };
    
    document.addEventListener("click", handleOutsideClick);

    // Form submission
    formContainer.addEventListener("submit", (e) => {
      e.preventDefault();
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      if (!isValidOption) {
        dropdownSearch.classList.add("dropdown-extension-invalid");
        setTimeout(() => dropdownSearch.classList.remove("dropdown-extension-invalid"), 1500);
        return;
      }

      // Disable input and prevent changes after submission
      dropdownSearch.disabled = true;
      dropdownSearch.style.backgroundColor = darkMode ? "#1E293B" : "#f5f5f5";
      dropdownSearch.style.cursor = "not-allowed";
      dropdownSearch.style.opacity = "0.7";
      
      // Remove all event listeners to prevent any interaction
      dropdownSearch.removeEventListener("focus", showDropup);
      dropdownSearch.removeEventListener("click", showDropup);
      dropdownSearch.removeEventListener("input", handleInput);
      dropdownSearch.removeEventListener("keydown", handleKeyNavigation);
      
      // Disable submit button
      submitButton.disabled = true;
      submitButton.style.opacity = "0.5";
      submitButton.style.pointerEvents = "none";
      
      // Re-enable Voiceflow's inputs
      toggleInputs(false);
      
      // Send data back to Voiceflow
      window.voiceflow.chat.interact({
        type: "complete",
        payload: { dropdown: hiddenDropdownInput.value },
      });
    });

    const cleanup = () => {
      document.removeEventListener("click", handleOutsideClick);
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
    // Configuration from Voiceflow
    const options = trace.payload?.options || [];
    const maxSelections = trace.payload?.maxSelections || options.length;
    const primaryColor = trace.payload?.color || "#545857";
    const title = trace.payload?.title || "Select your options";
    const subtitle = trace.payload?.subtitle || (maxSelections < options.length ? 
      `Choose up to ${maxSelections} options` : '');
    const submitText = trace.payload?.submitText || "Submit";
    const cancelText = trace.payload?.cancelText || "Cancel";
    const darkMode = trace.payload?.darkMode || false;
    
    // Color utility functions
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Lighten/darken a hex color
    const adjustColor = (hex, percent) => {
      const num = parseInt(hex.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      
      return '#' + (
        0x1000000 + 
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      ).toString(16).slice(1);
    };
    
    // Set colors based on mode
    const colors = {
      primary: primaryColor,
      hover: adjustColor(primaryColor, 10),
      border: hexToRgba(primaryColor, 0.2),
      borderHover: hexToRgba(primaryColor, 0.4),
      background: darkMode ? "#1E293B" : "white",
      surface: darkMode ? "#334155" : "white",
      text: darkMode ? "#F1F5F9" : "#303235",
      textSecondary: darkMode ? "#94A3B8" : "#72727a",
      error: "#ff4444"
    };

    // Improved input disabling that preserves scrolling
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) return;
      
      // FIRST: Ensure message container remains scrollable
      const messageContainer = chatDiv.shadowRoot.querySelector(".vfrc-chat-messages");
      if (messageContainer) {
        // Always keep messages scrollable
        messageContainer.style.pointerEvents = "auto";
        messageContainer.style.overflow = "auto"; 
        messageContainer.style.touchAction = "auto"; // Important for mobile
      }
      
      // Also ensure any parent scrollable containers remain functional
      const scrollContainers = chatDiv.shadowRoot.querySelectorAll(".vfrc-chat-container, .vfrc-chat");
      scrollContainers.forEach(container => {
        if (container) {
          container.style.pointerEvents = "auto";
          container.style.overflow = "auto";
          container.style.touchAction = "auto";
        }
      });
      
      // Only disable the input controls
      const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
      if (inputContainer) {
        inputContainer.style.opacity = disable ? "0.5" : "1";
        inputContainer.style.pointerEvents = disable ? "none" : "auto";
        inputContainer.style.transition = "opacity 0.3s ease";
      }

      // Disable specific input elements
      const elements = {
        textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
        buttons: chatDiv.shadowRoot.querySelectorAll("button"),
        inputs: chatDiv.shadowRoot.querySelectorAll("input")
      };

      Object.values(elements).forEach(elementList => {
        elementList.forEach(el => {
          if (inputContainer && inputContainer.contains(el)) {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
          }
        });
      });
    };

    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.className = "multi-select-form";

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        
        .multi-select-form {
          display: block;
          width: 100%;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .multi-select-container {
          width: 100%;
        }
        
        .multi-select-title {
          font-size: 14px;
          color: ${colors.text};
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .multi-select-subtitle {
          font-size: 13px;
          color: ${colors.textSecondary};
          margin-bottom: 16px;
          opacity: 0.9;
        }
        
        .multi-select-options {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
          max-height: 400px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: ${hexToRgba(colors.primary, 0.4)} ${darkMode ? "#334155" : "#f1f1f1"};
          padding-right: 4px;
          -webkit-overflow-scrolling: touch; /* For smooth scrolling on iOS */
        }
        
        /* Scrollbar styles */
        .multi-select-options::-webkit-scrollbar {
          width: 6px;
        }
        
        .multi-select-options::-webkit-scrollbar-track {
          background: ${darkMode ? "#334155" : "#f1f1f1"};
          border-radius: 10px;
        }
        
        .multi-select-options::-webkit-scrollbar-thumb {
          background: ${hexToRgba(colors.primary, 0.4)};
          border-radius: 10px;
        }
        
        .multi-select-options::-webkit-scrollbar-thumb:hover {
          background: ${colors.primary};
        }
        
        .option-label {
          display: flex;
          align-items: center;
          padding: 12px;
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          position: relative;
          overflow: hidden;
        }
        
        .option-label:hover {
          border-color: ${colors.borderHover};
          transform: translateX(2px);
        }
        
        /* Ripple effect */
        .option-label::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background-color: ${hexToRgba(colors.primary, 0.1)};
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          transition: transform 0.4s ease-out, opacity 0.4s ease-out;
          pointer-events: none;
          opacity: 0;
        }
        
        .option-label:active::after {
          transform: translate(-50%, -50%) scale(2);
          opacity: 0;
        }
        
        .checkbox-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-right: 12px;
          border: 2px solid ${colors.textSecondary};
          border-radius: 4px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .option-label:hover .checkbox-wrapper {
          border-color: ${colors.primary};
        }
        
        .checkbox-input {
          display: none;
        }
        
        .checkbox-input:checked + .checkbox-wrapper {
          background: ${colors.primary};
          border-color: ${colors.primary};
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
          color: ${colors.text};
          line-height: 1.4;
        }
        
        .error-message {
          color: ${colors.error};
          font-size: 13px;
          margin: -8px 0 12px;
          display: none;
          animation: slideIn 0.3s ease;
          padding: 8px 12px;
          background: ${hexToRgba(colors.error, 0.1)};
          border-radius: 6px;
        }
        
        .button-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .submit-button, .cancel-button {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        
        .submit-button::after, .cancel-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          transition: transform 0.4s ease-out, opacity 0.4s ease-out;
          pointer-events: none;
        }
        
        .submit-button:active::after, .cancel-button:active::after {
          transform: translate(-50%, -50%) scale(2);
          opacity: 0;
        }
        
        .submit-button {
          background: ${colors.primary};
          color: white;
        }
        
        .submit-button:not(:disabled):hover {
          background: ${colors.hover};
          transform: translateY(-1px);
        }
        
        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .cancel-button {
          background: transparent;
          color: ${colors.textSecondary};
          border: 1px solid ${colors.border};
        }
        
        .cancel-button:hover {
          background: ${hexToRgba(colors.primary, 0.08)};
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
        
        /* Fade-in animation for options */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .option-label {
          opacity: 0;
          animation: fadeInUp 0.3s ease forwards;
        }
        
        /* Mobile optimizations */
        @media screen and (max-width: 480px) {
          .button-group {
            grid-template-columns: 1fr;
          }
          
          .option-label {
            padding: 14px 12px; /* Larger tap target on mobile */
          }
        }
      </style>
      
      <div class="multi-select-container">
        <div class="multi-select-title">${title}</div>
        ${subtitle ? `<div class="multi-select-subtitle">${subtitle}</div>` : ''}
        <div class="multi-select-options">
          ${options.map((option, index) => `
            <label class="option-label" style="animation-delay: ${index * 0.05}s" tabindex="0" role="checkbox" aria-checked="false">
              <input type="checkbox" class="checkbox-input" name="options" value="${option}">
              <div class="checkbox-wrapper"></div>
              <span class="option-text">${option}</span>
            </label>
          `).join('')}
        </div>
        <div class="error-message" role="alert"></div>
        <div class="button-group">
          <button type="button" class="cancel-button">${cancelText}</button>
          <button type="submit" class="submit-button" disabled>${submitText}</button>
        </div>
      </div>
    `;

    let isSubmitted = false;
    const errorMessage = multiSelectContainer.querySelector(".error-message");
    const submitButton = multiSelectContainer.querySelector(".submit-button");
    const cancelButton = multiSelectContainer.querySelector(".cancel-button");
    const checkboxLabels = multiSelectContainer.querySelectorAll('.option-label');
    const checkboxes = multiSelectContainer.querySelectorAll('input[type="checkbox"]');
    const optionsContainer = multiSelectContainer.querySelector('.multi-select-options');

    const updateSubmitButton = () => {
      if (isSubmitted) return;
      const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
      submitButton.disabled = selectedCount === 0;
    };

    const showError = (message) => {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
      optionsContainer.classList.add('shake');
      setTimeout(() => {
        optionsContainer.classList.remove('shake');
      }, 300);
    };

    // Handle checkbox changes
    checkboxes.forEach((checkbox, index) => {
      const label = checkboxLabels[index];
      
      // Initial ARIA setup
      label.setAttribute('aria-checked', 'false');
      
      checkbox.addEventListener("change", () => {
        if (isSubmitted) return;
        
        // Update ARIA attributes
        label.setAttribute('aria-checked', checkbox.checked ? 'true' : 'false');
        
        const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
        
        if (selectedCount > maxSelections) {
          checkbox.checked = false;
          label.setAttribute('aria-checked', 'false');
          showError(`You can select up to ${maxSelections} options`);
        } else {
          errorMessage.style.display = "none";
        }
        
        updateSubmitButton();
      });
      
      // Enable keyboard interaction
      label.addEventListener('keydown', (e) => {
        if (isSubmitted) return;
        // Toggle on Space or Enter
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
      
      // Animations with staggered delay
      setTimeout(() => {
        label.style.opacity = "1";
      }, 50 + (index * 50));
    });

    // Ensure proper scrolling behavior in the options container
    optionsContainer.addEventListener('wheel', (e) => {
      const { scrollTop, scrollHeight, clientHeight } = optionsContainer;
      const isAtTop = scrollTop === 0 && e.deltaY < 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
      
      if (isAtTop || isAtBottom) {
        e.preventDefault();
      }
    });

    multiSelectContainer.addEventListener("submit", (e) => {
      e.preventDefault();
      if (isSubmitted) return;

      const selectedOptions = Array.from(
        multiSelectContainer.querySelectorAll('input[name="options"]:checked')
      ).map(input => input.value);

      isSubmitted = true;
      
      // Disable all inputs in the component
      checkboxes.forEach((checkbox, index) => {
        checkbox.disabled = true;
        const label = checkboxLabels[index];
        label.style.opacity = "0.7";
        label.style.cursor = "not-allowed";
        label.style.transform = "none";
        label.style.pointerEvents = "none";
        label.setAttribute('tabindex', '-1');
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
      checkboxes.forEach((checkbox, index) => {
        checkbox.disabled = true;
        const label = checkboxLabels[index];
        label.style.opacity = "0.7";
        label.style.cursor = "not-allowed";
        label.style.transform = "none";
        label.style.pointerEvents = "none";
        label.setAttribute('tabindex', '-1');
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
    // Configuration from Voiceflow
    const options = trace.payload?.options || [];
    const primaryColor = trace.payload?.color || "#545857";
    const title = trace.payload?.title || "Drag and drop to rank in order of preference";
    const submitText = trace.payload?.submitText || "Submit";
    const darkMode = trace.payload?.darkMode || false;
    const submitMessage = trace.payload?.submitMessage || "Rankings submitted";
    
    // Color utility functions
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Lighten/darken a hex color
    const adjustColor = (hex, percent) => {
      const num = parseInt(hex.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      
      return '#' + (
        0x1000000 + 
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      ).toString(16).slice(1);
    };
    
    // Set colors based on mode
    const colors = {
      primary: primaryColor,
      hover: adjustColor(primaryColor, 10),
      background: darkMode ? "#1E293B" : "white",
      surface: darkMode ? "#334155" : "white", 
      text: darkMode ? "#F1F5F9" : "#303235",
      textSecondary: darkMode ? "#94A3B8" : "#666666",
      border: darkMode ? "#475569" : "rgba(0, 0, 0, 0.08)",
      borderHover: hexToRgba(primaryColor, 0.3),
      shadow: darkMode ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.1)"
    };

    // Improved input disabling that preserves scrolling
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) return;
      
      // FIRST: Ensure message container remains scrollable
      const messageContainer = chatDiv.shadowRoot.querySelector(".vfrc-chat-messages");
      if (messageContainer) {
        // Always keep messages scrollable
        messageContainer.style.pointerEvents = "auto";
        messageContainer.style.overflow = "auto"; 
        messageContainer.style.touchAction = "auto"; // Important for mobile
      }
      
      // Also ensure any parent scrollable containers remain functional
      const scrollContainers = chatDiv.shadowRoot.querySelectorAll(".vfrc-chat-container, .vfrc-chat");
      scrollContainers.forEach(container => {
        if (container) {
          container.style.pointerEvents = "auto";
          container.style.overflow = "auto";
          container.style.touchAction = "auto";
        }
      });
      
      // Only disable the input controls
      const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
      if (inputContainer) {
        inputContainer.style.opacity = disable ? "0.5" : "1";
        inputContainer.style.pointerEvents = disable ? "none" : "auto";
        inputContainer.style.transition = "opacity 0.3s ease";
      }

      // Disable specific input elements
      const elements = {
        textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
        buttons: chatDiv.shadowRoot.querySelectorAll("button"),
        inputs: chatDiv.shadowRoot.querySelectorAll("input")
      };

      Object.values(elements).forEach(elementList => {
        elementList.forEach(el => {
          if (inputContainer && inputContainer.contains(el)) {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
          }
        });
      });
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
      formContainer.className = "rank-options-form";

      formContainer.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
          
          .rank-options-form {
            display: block;
            width: 100%;
          }
          
          .rank-options-container {
            font-family: 'Inter', system-ui, sans-serif;
            padding: 0;
            width: 100%;
          }
          
          .rank-title {
            font-size: 14px;
            margin-bottom: 12px;
            color: ${colors.text};
            font-weight: 500;
          }
          
          .rank-options-list {
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
            max-height: 350px;
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: thin;
            scrollbar-color: ${hexToRgba(colors.primary, 0.4)} ${darkMode ? "#334155" : "#f1f1f1"};
            -webkit-overflow-scrolling: touch; /* For smooth scrolling on iOS */
          }
          
          /* Scrollbar styles */
          .rank-options-list::-webkit-scrollbar {
            width: 6px;
          }
          
          .rank-options-list::-webkit-scrollbar-track {
            background: ${darkMode ? "#334155" : "#f1f1f1"};
            border-radius: 8px;
          }
          
          .rank-options-list::-webkit-scrollbar-thumb {
            background: ${hexToRgba(colors.primary, 0.4)};
            border-radius: 8px;
          }
          
          .rank-options-list::-webkit-scrollbar-thumb:hover {
            background: ${colors.primary};
          }
          
          .rank-options-list li {
            display: flex;
            align-items: center;
            padding: 12px 14px;
            margin-bottom: 8px;
            background-color: ${colors.surface};
            border: 1px solid ${colors.border};
            border-radius: 8px;
            cursor: grab;
            font-size: 14px;
            color: ${colors.text};
            width: 100%;
            box-sizing: border-box;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
            user-select: none;
            touch-action: none; /* Necessary for mobile drag */
          }
          
          .rank-options-list li:before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 4px;
            background: ${colors.primary};
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          .rank-options-list li:hover {
            border-color: ${colors.borderHover};
            box-shadow: 0 2px 4px ${hexToRgba(colors.shadow, 0.1)};
            transform: translateX(2px);
          }
          
          .rank-options-list li:hover:before {
            opacity: 1;
          }
          
          .rank-options-list li:active {
            cursor: grabbing;
            background-color: ${darkMode ? "#2C3E50" : "#f8f9fa"};
            transform: scale(1.02);
          }

          .rank-options-list.disabled li {
            cursor: not-allowed;
            opacity: 0.7;
            transform: none;
            pointer-events: none;
          }

          .rank-number {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            color: ${colors.textSecondary};
            font-size: 14px;
            font-weight: 600;
            margin-right: 12px;
            user-select: none;
            transition: color 0.2s ease;
          }
          
          li:hover .rank-number {
            color: ${colors.primary};
          }
          
          .rank-text {
            flex: 1;
            padding-right: 8px;
            line-height: 1.4;
          }
          
          .submit-button {
            width: 100%;
            padding: 12px 16px;
            background-color: ${colors.primary};
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 16px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .submit-button:not(:disabled):hover {
            background-color: ${colors.hover};
            transform: translateY(-1px);
            box-shadow: 0 2px 4px ${hexToRgba(colors.shadow, 0.2)};
          }
          
          .submit-button:not(:disabled):active {
            transform: translateY(0);
          }

          .submit-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .sortable-ghost {
            opacity: 0.3;
            background: ${darkMode ? "#2C3E50" : "#f5f5f5"};
            border: 2px dashed ${colors.primary};
          }

          .sortable-drag {
            background-color: ${colors.surface};
            box-shadow: 0 4px 8px ${hexToRgba(colors.shadow, 0.2)};
            border-color: ${colors.primary};
            transform: rotate(2deg) !important;
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
            width: 14px;
            height: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 3px;
            margin-left: auto;
            opacity: 0.4;
            transition: opacity 0.2s ease;
            cursor: grab;
            padding: 0 4px;
          }
          
          .rank-handle span {
            width: 100%;
            height: 2px;
            background: ${colors.text};
            border-radius: 1px;
            display: block;
          }

          li:hover .rank-handle {
            opacity: 0.7;
          }
          
          li:active .rank-handle {
            cursor: grabbing;
          }

          .submitted-message {
            color: ${colors.textSecondary};
            font-size: 13px;
            text-align: center;
            margin-top: 12px;
            font-style: italic;
            opacity: 0;
            animation: fadeIn 0.5s ease forwards 0.2s;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          /* Remove any down arrows that might be added by the chat UI */
          [class*="scroll-down"],
          [class*="scroll-button"] {
            display: none !important;
          }
          
          /* Make touch friendly on mobile */
          @media (max-width: 480px) {
            .rank-options-list li {
              padding: 14px;
            }
            
            .rank-handle {
              padding: 8px 4px;
            }
          }
        </style>
        
        <div class="rank-options-container">
          <div class="rank-title">${title}</div>
          <ul class="rank-options-list" aria-label="Sortable list of options to rank">
            ${options.map((option, index) => `
              <li data-value="${option}" style="--item-index: ${index}" tabindex="0" role="option" aria-grabbed="false">
                <span class="rank-number">${index + 1}</span>
                <span class="rank-text">${option}</span>
                <div class="rank-handle" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </li>
            `).join('')}
          </ul>
          <button type="submit" class="submit-button">${submitText}</button>
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
        message.textContent = submitMessage;
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
      
      // Enable keyboard interaction for list items
      const listItems = formContainer.querySelectorAll('.rank-options-list li');
      listItems.forEach((item) => {
        item.addEventListener('keydown', (e) => {
          if (isSubmitted) return;
          
          // Space or Enter for grabbing/releasing
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            // Toggle grab state
            const isGrabbed = item.getAttribute('aria-grabbed') === 'true';
            
            // If already grabbed, release it
            if (isGrabbed) {
              item.setAttribute('aria-grabbed', 'false');
              return;
            }
            
            // Clear any other grabbed items
            listItems.forEach(li => li.setAttribute('aria-grabbed', 'false'));
            
            // Grab this item
            item.setAttribute('aria-grabbed', 'true');
          }
          
          // Up/Down arrows for moving grabbed items
          if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && 
              item.getAttribute('aria-grabbed') === 'true') {
            e.preventDefault();
            
            const list = item.parentNode;
            const items = Array.from(list.children);
            const currentIndex = items.indexOf(item);
            
            let newIndex;
            if (e.key === 'ArrowUp' && currentIndex > 0) {
              newIndex = currentIndex - 1;
            } else if (e.key === 'ArrowDown' && currentIndex < items.length - 1) {
              newIndex = currentIndex + 1;
            } else {
              return;
            }
            
            // Move the item
            if (newIndex >= 0 && newIndex < items.length) {
              list.insertBefore(item, 
                newIndex > currentIndex ? items[newIndex].nextSibling : items[newIndex]);
              updateRankNumbers();
              item.focus();
            }
          }
        });
      });

      // Fix touch handling on mobile
      const optionsList = formContainer.querySelector('.rank-options-list');
      optionsList.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      }, { passive: false });
      
      // Ensure proper scrolling
      optionsList.addEventListener('wheel', (e) => {
        const { scrollTop, scrollHeight, clientHeight } = optionsList;
        const isAtTop = scrollTop === 0 && e.deltaY < 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
        
        if ((isAtTop || isAtBottom) && e.cancelable) {
          e.preventDefault();
        }
      });

      element.appendChild(formContainer);

      if (typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(formContainer.querySelector('.rank-options-list'), {
          animation: 150,
          onEnd: updateRankNumbers,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
          disabled: isSubmitted,
          handle: '.rank-handle',
          forceFallback: true,
          fallbackTolerance: 3,
          scroll: true,
          bubbleScroll: true
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
      // Configuration options
      const delay = Math.max(0, parseInt(trace.payload?.delay) || 1000);
      const showIndicator = trace.payload?.showIndicator !== false;
      const indicatorText = trace.payload?.indicatorText || "Processing...";
      const primaryColor = trace.payload?.color || "#545857";
      const darkMode = trace.payload?.darkMode || false;
      
      // Color utility functions
      const hexToRgba = (hex, alpha = 1) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
      
      // Set colors based on mode
      const colors = {
        primary: primaryColor,
        background: darkMode ? "#1E293B" : "rgba(84, 88, 87, 0.05)",
        text: darkMode ? "#94A3B8" : "#72727a",
        progress: darkMode ? "#334155" : "#e2e8f0",
        progressBar: primaryColor
      };

      // Improved function to disable/enable chat inputs while preserving scrolling
      const toggleInputs = (disable) => {
        const chatDiv = document.getElementById("voiceflow-chat");
        if (!chatDiv?.shadowRoot) return;
        
        // FIRST: Ensure message container remains scrollable
        const messageContainer = chatDiv.shadowRoot.querySelector(".vfrc-chat-messages");
        if (messageContainer) {
          // Always keep messages scrollable
          messageContainer.style.pointerEvents = "auto";
          messageContainer.style.overflow = "auto"; 
          messageContainer.style.touchAction = "auto"; // Important for mobile
        }
        
        // Also ensure any parent scrollable containers remain functional
        const scrollContainers = chatDiv.shadowRoot.querySelectorAll(".vfrc-chat-container, .vfrc-chat");
        scrollContainers.forEach(container => {
          if (container) {
            container.style.pointerEvents = "auto";
            container.style.overflow = "auto";
            container.style.touchAction = "auto";
          }
        });
        
        // Only disable the input controls
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
          inputContainer.style.transition = "opacity 0.3s ease";
        }

        // Disable specific input elements
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          buttons: chatDiv.shadowRoot.querySelectorAll("button"),
          inputs: chatDiv.shadowRoot.querySelectorAll("input")
        };

        Object.values(elements).forEach(elementList => {
          elementList.forEach(el => {
            if (inputContainer && inputContainer.contains(el)) {
              el.disabled = disable;
              el.style.pointerEvents = disable ? "none" : "auto";
              el.style.opacity = disable ? "0.5" : "1";
            }
          });
        });
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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
            
            .delay-indicator {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 12px 16px;
              margin: 12px 0;
              background: ${colors.background};
              border-radius: 10px;
              font-family: 'Inter', system-ui, sans-serif;
              font-size: 14px;
              color: ${colors.text};
              animation: fadeIn 0.3s ease;
              width: auto;
              max-width: 300px;
            }
            
            .delay-indicator-content {
              width: 100%;
            }
            
            .delay-progress {
              width: 100%;
              height: 4px;
              background: ${colors.progress};
              border-radius: 2px;
              margin-top: 8px;
              overflow: hidden;
            }
            
            .delay-progress-bar {
              height: 100%;
              background: ${colors.progressBar};
              width: 100%;
              transition: width linear;
              transform-origin: left;
              border-radius: 2px;
            }
            
            @keyframes pulse {
              0% { opacity: 0.7; }
              50% { opacity: 1; }
              100% { opacity: 0.7; }
            }
            
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            .delay-indicator-text {
              animation: pulse 2s infinite;
              font-weight: 500;
              display: flex;
              align-items: center;
            }
            
            .delay-indicator-dots {
              display: inline-flex;
              margin-left: 4px;
            }
            
            .dot {
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: ${colors.text};
              margin: 0 2px;
              opacity: 0.7;
            }
            
            .dot:nth-child(1) { animation: bounce 1.5s infinite 0s; }
            .dot:nth-child(2) { animation: bounce 1.5s infinite 0.2s; }
            .dot:nth-child(3) { animation: bounce 1.5s infinite 0.4s; }
            
            @keyframes bounce {
              0%, 60%, 100% { transform: translateY(0); }
              30% { transform: translateY(-4px); }
            }
          </style>
          <div class="delay-indicator-content">
            <div class="delay-indicator-text">
              ${indicatorText}
              <div class="delay-indicator-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
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
      
      // Show delay indicator if enabled and delay is significant
      const indicator = showIndicator && delay > 500 ? showDelayIndicator(delay) : null;

      // Execute delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Remove indicator with a fade-out animation if it exists
      if (indicator) {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease';
        
        // Remove from DOM after animation completes
        setTimeout(() => {
          indicator.remove();
        }, 300);
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
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = "1";
          inputContainer.style.pointerEvents = "auto";
        }
      }
      
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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      
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
        font-family: 'Inter', system-ui, sans-serif;
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
    
    // Improved toggleInputs function that preserves scrolling
    const toggleInputs = (disable) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) return;
      
      // FIRST: Ensure message container remains scrollable
      const messageContainer = chatDiv.shadowRoot.querySelector(".vfrc-chat-messages");
      if (messageContainer) {
        // Always keep messages scrollable
        messageContainer.style.pointerEvents = "auto";
        messageContainer.style.overflow = "auto"; 
        messageContainer.style.touchAction = "auto"; // Important for mobile
      }
      
      // Also ensure any parent scrollable containers remain functional
      const scrollContainers = chatDiv.shadowRoot.querySelectorAll(".vfrc-chat-container, .vfrc-chat");
      scrollContainers.forEach(container => {
        if (container) {
          container.style.pointerEvents = "auto";
          container.style.overflow = "auto";
          container.style.touchAction = "auto";
        }
      });
      
      // Only disable the input controls
      const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
      if (inputContainer) {
        inputContainer.style.opacity = disable ? "0.5" : "1";
        inputContainer.style.pointerEvents = disable ? "none" : "auto";
        inputContainer.style.transition = "opacity 0.3s ease";
      }

      // Disable specific input elements
      const elements = {
        textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
        buttons: chatDiv.shadowRoot.querySelectorAll("button"),
        inputs: chatDiv.shadowRoot.querySelectorAll("input")
      };

      Object.values(elements).forEach(elementList => {
        elementList.forEach(el => {
          if (inputContainer && inputContainer.contains(el)) {
            el.disabled = disable;
            el.style.pointerEvents = disable ? "none" : "auto";
            el.style.opacity = disable ? "0.5" : "1";
            el.style.transition = "opacity 0.3s ease";
          }
        });
      });
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
      title: trace.payload?.title || "",
      confirmText: trace.payload?.confirmText || "Confirm",
      cancelText: trace.payload?.cancelText || "Cancel",
      primaryColor: trace.payload?.color || "#4F46E5", // Indigo default
      maxYear: parseInt(trace.payload?.maxYear) || new Date().getFullYear(),
      minYear: parseInt(trace.payload?.minYear) || 1900,
      ageLabel: trace.payload?.ageLabel || "Your age", 
      darkMode: trace.payload?.darkMode || false,
      preventFutureDates: trace.payload?.preventFutureDates !== false // Default true
    };
    
    // Create a unique ID for this instance
    const instanceId = `datepicker-${Date.now()}`;
    
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
    
    const isFutureDate = (year, month, day) => {
      if (!config.preventFutureDates) return false;
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date > today;
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
      hover: config.darkMode ? '#475569' : '#F1F5F9',
      success: '#10B981',
      successLight: hexToRgba('#10B981', 0.1)
    };
    
    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Style
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      .datepicker-container {
        font-family: 'Inter', system-ui, sans-serif;
        background: ${colors.background};
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, ${config.darkMode ? 0.4 : 0.08});
        overflow: hidden;
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid ${colors.border};
      }
      
      .datepicker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: ${config.title ? '14px 16px' : '0'};
        background: ${colors.surface};
        border-bottom: ${config.title ? `1px solid ${colors.border}` : 'none'};
      }
      
      .datepicker-title {
        font-size: 15px;
        font-weight: 600;
        color: ${colors.text};
        letter-spacing: -0.01em;
      }
      
      .datepicker-body {
        padding: 16px;
        position: relative;
      }
      
      /* Custom dropdown styling */
      .select-container {
        position: relative;
        margin-bottom: 16px;
      }
      
      .select-label {
        font-size: 13px;
        font-weight: 500;
        color: ${colors.textSecondary};
        margin-bottom: 6px;
        display: block;
      }
      
      .custom-select {
        width: 100%;
        padding: 12px 14px;
        font-size: 14px;
        font-weight: 500;
        color: ${colors.text};
        background: ${colors.surface};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        appearance: none;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Inter', system-ui, sans-serif;
      }
      
      .custom-select:focus {
        outline: none;
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 2px ${hexToRgba(config.primaryColor, 0.2)};
      }
      
      .custom-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .select-container::after {
        content: '';
        position: absolute;
        right: 16px;
        top: calc(50% + 10px);
        width: 10px;
        height: 6px;
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23${config.primaryColor.substring(1)}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
        background-repeat: no-repeat;
        pointer-events: none;
      }
      
      /* Results display */
      .date-summary {
        background: ${colors.surface};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        padding: 12px;
        margin: 16px 0;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        color: ${colors.text};
        transition: all 0.2s ease;
      }
      
      .date-summary.has-date {
        border-color: ${hexToRgba(config.primaryColor, 0.3)};
        background: ${hexToRgba(config.primaryColor, 0.05)};
      }
      
      .age-display {
        text-align: center;
        padding: 12px;
        background: ${hexToRgba(config.primaryColor, 0.1)};
        color: ${config.primaryColor};
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        display: none;
        animation: fadeIn 0.3s ease;
        border: 1px solid ${hexToRgba(config.primaryColor, 0.15)};
        margin-bottom: 16px;
      }
      
      .error-text {
        text-align: center;
        padding: 12px;
        background: ${hexToRgba('#EF4444', 0.1)};
        color: #EF4444;
        border-radius: 12px;
        font-size: 14px;
        margin-bottom: 16px;
        border: 1px solid ${hexToRgba('#EF4444', 0.2)};
        display: none;
        animation: fadeIn 0.3s ease;
      }
      
      /* Success state */
      .success-state {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${colors.background};
        animation: fadeIn 0.3s ease;
        padding: 16px;
        box-sizing: border-box;
      }
      
      .success-content {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .success-icon {
        width: 48px;
        height: 48px;
        background: ${colors.successLight};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.1s;
        transform: scale(0.5);
        opacity: 0;
      }
      
      .success-message {
        font-size: 16px;
        font-weight: 600;
        color: ${colors.text};
        margin-bottom: 8px;
        animation: fadeUp 0.3s ease forwards 0.2s;
        opacity: 0;
        transform: translateY(10px);
      }
      
      .success-details {
        font-size: 14px;
        color: ${colors.textSecondary};
        animation: fadeUp 0.3s ease forwards 0.3s;
        opacity: 0;
        transform: translateY(10px);
      }
      
      /* Processing overlay */
      .processing-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${hexToRgba(colors.background, 0.8)};
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      
      .processing-overlay.active {
        opacity: 1;
        pointer-events: all;
      }
      
      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid ${hexToRgba(config.primaryColor, 0.2)};
        border-radius: 50%;
        border-top-color: ${config.primaryColor};
        animation: spin 1s linear infinite;
      }
      
      /* Buttons */
      .buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .btn {
        padding: 12px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        font-family: 'Inter', system-ui, sans-serif;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
      }
      
      .btn::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        transition: transform 0.4s ease-out;
        pointer-events: none;
      }
      
      .btn:active::after {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
        transition: transform 0.4s ease-out, opacity 0.4s ease-out;
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
        box-shadow: 0 2px 5px ${hexToRgba(config.primaryColor, 0.4)};
      }
      
      .btn-confirm:hover {
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
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .highlight-animation {
        animation: highlight 0.5s ease;
      }
      
      @keyframes highlight {
        0% { background: ${hexToRgba(config.primaryColor, 0.2)}; }
        100% { background: ${hexToRgba(config.primaryColor, 0.05)}; }
      }
    `;
    
    // Create the container element
    const container = document.createElement('div');
    container.id = instanceId;
    
    // Set initial state
    const today = new Date();
    let selectedYear = null;
    let selectedMonth = null;
    let selectedDay = null;
    let selectedDate = null;
    let isProcessing = false;
    let isCompleted = false;
    
    // Get days in month
    const getDaysInMonth = (year, month) => {
      return new Date(year, month + 1, 0).getDate();
    };
    
    // Create the HTML structure
    container.innerHTML = `
      <style>${styles}</style>
      <div class="datepicker-container">
        ${config.title ? `
        <div class="datepicker-header">
          <div class="datepicker-title">${config.title}</div>
        </div>
        ` : ''}
        
        <div class="datepicker-body">
          <!-- Month Dropdown -->
          <div class="select-container">
            <label for="month-select" class="select-label">Month</label>
            <select id="month-select" class="custom-select">
              <option value="" disabled selected>Select month</option>
              ${monthNames.map((month, index) => 
                `<option value="${index}">${month}</option>`
              ).join('')}
            </select>
          </div>
          
          <!-- Day Dropdown -->
          <div class="select-container">
            <label for="day-select" class="select-label">Day</label>
            <select id="day-select" class="custom-select" disabled>
              <option value="" disabled selected>Select day</option>
            </select>
          </div>
          
          <!-- Year Dropdown -->
          <div class="select-container">
            <label for="year-select" class="select-label">Year</label>
            <select id="year-select" class="custom-select">
              <option value="" disabled selected>Select year</option>
              ${Array.from({length: config.maxYear - config.minYear + 1}, (_, i) => config.maxYear - i)
                .map(year => `<option value="${year}">${year}</option>`)
                .join('')}
            </select>
          </div>
          
          <div class="date-summary">No date selected</div>
          <div class="age-display"></div>
          <div class="error-text">Please complete your selection</div>
          
          <div class="buttons">
            <button class="btn btn-cancel">${config.cancelText}</button>
            <button class="btn btn-confirm" disabled>${config.confirmText}</button>
          </div>
          
          <!-- Processing overlay -->
          <div class="processing-overlay">
            <div class="spinner"></div>
          </div>
          
          <!-- Success state -->
          <div class="success-state">
            <div class="success-content">
              <div class="success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13L9 17L19 7" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="success-message">Date confirmed</div>
              <div class="success-details"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append to the element
    element.appendChild(container);
    
    // Get DOM elements
    const monthSelect = container.querySelector('#month-select');
    const daySelect = container.querySelector('#day-select');
    const yearSelect = container.querySelector('#year-select');
    const dateSummary = container.querySelector('.date-summary');
    const ageDisplay = container.querySelector('.age-display');
    const errorText = container.querySelector('.error-text');
    const cancelButton = container.querySelector('.btn-cancel');
    const confirmButton = container.querySelector('.btn-confirm');
    const processingOverlay = container.querySelector('.processing-overlay');
    const successState = container.querySelector('.success-state');
    const successDetails = container.querySelector('.success-details');
    
    // Update day options based on selected month and year
    const updateDayOptions = () => {
      if (selectedMonth === null || selectedYear === null) {
        daySelect.disabled = true;
        return;
      }
      
      daySelect.disabled = false;
      
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      
      // Clear existing options except the placeholder
      daySelect.innerHTML = '<option value="" disabled selected>Select day</option>';
      
      // Add day options
      for (let day = 1; day <= daysInMonth; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        
        // Check if this day would create a future date
        if (isFutureDate(selectedYear, selectedMonth, day)) {
          option.disabled = true;
        }
        
        daySelect.appendChild(option);
      }
      
      // If we had a previously selected day, try to restore it
      if (selectedDay !== null) {
        if (selectedDay <= daysInMonth) {
          daySelect.value = selectedDay;
        } else {
          selectedDay = null;
        }
      }
    };
    
    // Update date summary
    const updateDateSummary = () => {
      if (selectedYear && selectedMonth !== null && selectedDay) {
        const formattedDate = formatDate(selectedYear, selectedMonth + 1, selectedDay);
        dateSummary.textContent = formattedDate;
        dateSummary.classList.add('has-date');
        dateSummary.classList.add('highlight-animation');
        setTimeout(() => {
          dateSummary.classList.remove('highlight-animation');
        }, 500);
        
        // Calculate age
        selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
        const age = calculateAge(selectedDate);
        
        // Update age display
        ageDisplay.textContent = `${config.ageLabel}: ${age} years`;
        ageDisplay.style.display = 'block';
        
        // Enable confirm button
        confirmButton.disabled = false;
        
        // Hide error if shown
        errorText.style.display = 'none';
      } else {
        dateSummary.textContent = 'No date selected';
        dateSummary.classList.remove('has-date');
        ageDisplay.style.display = 'none';
        confirmButton.disabled = true;
      }
    };
    
    // Disable all controls
    const disableAllControls = () => {
      monthSelect.disabled = true;
      daySelect.disabled = true;
      yearSelect.disabled = true;
      confirmButton.disabled = true;
      cancelButton.disabled = true;
    };
    
    // Show success state
    const showSuccessState = (date, age) => {
      // Update success details
      successDetails.textContent = `${formatDate(selectedYear, selectedMonth + 1, selectedDay)} (Age: ${age})`;
      
      // Show success state
      successState.style.display = 'block';
      
      // Hide processing overlay
      processingOverlay.classList.remove('active');
      
      // Disable all controls
      disableAllControls();
    };
    
    // Event Listeners
    monthSelect.addEventListener('change', (e) => {
      if (isCompleted || isProcessing) return;
      selectedMonth = parseInt(e.target.value);
      updateDayOptions();
      updateDateSummary();
    });
    
    daySelect.addEventListener('change', (e) => {
      if (isCompleted || isProcessing) return;
      selectedDay = parseInt(e.target.value);
      updateDateSummary();
    });
    
    yearSelect.addEventListener('change', (e) => {
      if (isCompleted || isProcessing) return;
      selectedYear = parseInt(e.target.value);
      updateDayOptions();
      updateDateSummary();
    });
    
    cancelButton.addEventListener('click', () => {
      if (isCompleted || isProcessing) return;
      
      // Disable controls to prevent further interaction
      disableAllControls();
      
      // Show processing state
      isProcessing = true;
      processingOverlay.classList.add('active');
      
      // Send cancel event to Voiceflow with a slight delay for visual feedback
      setTimeout(() => {
        window.voiceflow.chat.interact({
          type: "cancel",
          payload: { 
            cancelled: true,
            timestamp: Date.now()
          }
        });
      }, 500);
    });
    
    confirmButton.addEventListener('click', () => {
      if (isCompleted || isProcessing) return;
      
      if (!selectedYear || selectedMonth === null || !selectedDay) {
        // Show error message
        errorText.style.display = 'block';
        return;
      }
      
      // Show processing state
      isProcessing = true;
      processingOverlay.classList.add('active');
      
      // Format the date
      const month = selectedMonth + 1;
      const formattedDate = formatDate(selectedYear, month, selectedDay);
      
      // Calculate age
      const age = calculateAge(selectedDate);
      
      // Show success state after a brief delay for better UX
      setTimeout(() => {
        isCompleted = true;
        showSuccessState(formattedDate, age);
        
        // Send data to Voiceflow after showing success state
        setTimeout(() => {
          window.voiceflow.chat.interact({
            type: "complete",
            payload: {
              date: formattedDate,
              age: age,
              year: selectedYear,
              month: month,
              day: selectedDay,
              timestamp: Date.now()
            }
          });
        }, 1000);
      }, 800);
    });
    
    // Implement keyboard navigation
    container.addEventListener('keydown', (e) => {
      if (isCompleted || isProcessing) return;
      
      if (e.key === 'Enter' && !confirmButton.disabled) {
        e.preventDefault();
        confirmButton.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelButton.click();
      }
    });
    
    // Disable chat input while picker is open
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
