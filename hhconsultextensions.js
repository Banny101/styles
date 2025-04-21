export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    // Show loading indicator
    const showLoadingIndicator = () => {
      const chatContainer = document.querySelector('.vfrc-chat-messages');
      if (!chatContainer) return null;
      
      const loadingElement = document.createElement('div');
      loadingElement.className = 'browser-data-loading';
      loadingElement.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');
          
          .browser-data-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            margin: 8px 0;
            background: rgba(84, 88, 87, 0.05);
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
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

      // Send data back to chat
      window.voiceflow.chat.interact({
        type: "complete",
        payload: browserData
      });
    } catch (error) {
      console.error("BrowserData Extension Error:", error);
      
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

export const RankOptionsExtension = {
  name: "RankOptions",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_rankoptions" || trace.payload?.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    // Configuration options with defaults
    const config = {
      options: trace.payload?.options || [],
      color: trace.payload?.color || "#545857",
      title: trace.payload?.title || "Rank these items in order of importance",
      submitText: trace.payload?.submitText || "Submit",
      submitMessage: trace.payload?.submitMessage || "Rankings submitted",
      darkMode: trace.payload?.darkMode || false,
      slantTitle: trace.payload?.slantTitle || false, // New option for slanted title
      titleSkewDegree: trace.payload?.titleSkewDegree || -10 // Control skew angle
    };
    
    // Color utilities
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Determine colors based on mode and primary color
    const colors = {
      primary: config.color,
      text: config.darkMode ? "#E2E8F0" : "#303235",
      background: config.darkMode ? "#1E293B" : "#FFFFFF",
      surface: config.darkMode ? "#334155" : "#FFFFFF",
      border: config.darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
      secondaryText: config.darkMode ? "#94A3B8" : "#72727a",
      buttonHover: config.darkMode ? hexToRgba(config.color, 0.85) : hexToRgba(config.color, 0.9),
      shadow: config.darkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)",
      accent: hexToRgba(config.color, 0.15)
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
            font-family: 'Inter', sans-serif;
            max-width: 450px;
            margin: 0 auto;
          }
          
          .rank-options-container {
            padding: 0;
            width: 100%;
          }
          
          .rank-title {
            font-size: 15px;
            margin-bottom: 16px;
            color: ${colors.secondaryText};
            font-weight: 500;
            user-select: none;
            ${config.slantTitle ? `
              font-style: italic;
              transform: skewX(${config.titleSkewDegree}deg);
              display: inline-block;
              background: ${hexToRgba(config.color, 0.08)};
              padding: 6px 12px;
              border-radius: 4px;
              color: ${config.color};
              margin-left: -4px;
            ` : ''}
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
            padding: 14px 16px;
            margin-bottom: 10px;
            background-color: ${colors.surface};
            border: 1px solid ${colors.border};
            border-radius: 10px;
            cursor: grab;
            font-size: 14px;
            color: ${colors.text};
            width: 100%;
            box-sizing: border-box;
            transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
            position: relative;
            overflow: hidden;
            user-select: none;
            box-shadow: 0 1px 2px ${hexToRgba('#000000', 0.05)};
            will-change: transform, box-shadow, border-color, background-color;
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
            border-color: ${hexToRgba(colors.primary, 0.3)};
            box-shadow: 0 3px 6px ${colors.shadow};
            transform: translateY(-1px);
          }
          
          .rank-options-list li:hover:before {
            opacity: 1;
          }
          
          .rank-options-list li:active {
            cursor: grabbing;
            background-color: ${colors.accent};
            transform: scale(1.01);
          }

          .rank-options-list.disabled li {
            cursor: not-allowed;
            opacity: 0.7;
            pointer-events: none;
          }

          .rank-number {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            background: ${hexToRgba(colors.primary, 0.12)};
            color: ${colors.primary};
            font-size: 13px;
            font-weight: 600;
            margin-right: 12px;
            user-select: none;
            transition: all 0.2s ease;
            border-radius: 50%;
            padding: 0 2px;
          }
          
          li:hover .rank-number {
            background: ${colors.primary};
            color: white;
          }
          
          .rank-text {
            flex: 1;
            padding-right: 4px;
            line-height: 1.4;
          }
          
          .submit-button {
            width: 100%;
            padding: 14px 16px;
            background-color: ${colors.primary};
            color: white;
            border: none;
            border-radius: 10px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 16px;
            transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 5px ${hexToRgba(colors.primary, 0.3)};
          }
          
          .submit-button:not(:disabled):hover {
            background-color: ${colors.buttonHover};
            transform: translateY(-2px);
            box-shadow: 0 4px 8px ${hexToRgba(colors.primary, 0.4)};
          }
          
          .submit-button:not(:disabled):active {
            transform: translateY(0);
            box-shadow: 0 2px 4px ${hexToRgba(colors.primary, 0.3)};
          }

          .submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: ${colors.secondaryText};
            box-shadow: none;
          }
          
          .sortable-ghost {
            opacity: 0.3;
            background: ${colors.accent};
            border: 2px dashed ${colors.primary};
            box-shadow: none !important;
          }

          .sortable-drag {
            background-color: ${colors.accent};
            box-shadow: 0 8px 16px ${colors.shadow};
            border-color: ${colors.primary};
            z-index: 1000;
            opacity: 0.9;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .rank-options-list li {
            animation: slideIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            animation-delay: calc(var(--item-index) * 0.08s);
            opacity: 0;
          }

          .rank-handle {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 3px;
            margin-left: auto;
            padding: 8px;
            opacity: 0.4;
            transition: opacity 0.2s ease;
            border-radius: 6px;
          }
          
          .rank-handle:hover {
            background: ${hexToRgba('#000000', config.darkMode ? 0.2 : 0.05)};
          }

          .rank-handle span {
            width: 25px;
            height: 2px;
            background: ${colors.text};
            border-radius: 1px;
          }

          li:hover .rank-handle {
            opacity: 0.7;
          }

          .submitted-message {
            color: ${colors.primary};
            font-size: 14px;
            text-align: center;
            margin-top: 16px;
            font-weight: 500;
            padding: 12px;
            background: ${colors.accent};
            border-radius: 8px;
            animation: fadeIn 0.5s ease;
          }
          
          /* Sortable animations */
          .sortable-chosen {
            background-color: ${colors.accent} !important;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          [class*="scroll-down"],
          [class*="scroll-button"] {
            display: none !important;
          }
        </style>
        
        <div class="rank-options-container">
          <div class="rank-title">${config.title}</div>
          <ul class="rank-options-list">
            ${config.options.map((option, index) => `
              <li data-value="${option}" style="--item-index: ${index}" aria-label="Item ${index + 1}: ${option}">
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
          <button type="submit" class="submit-button">${config.submitText}</button>
        </div>
      `;

      let isSubmitted = false;
      let sortableInstance = null;

      const updateRankNumbers = () => {
        if (!isSubmitted) {
          formContainer.querySelectorAll('.rank-number').forEach((span, index) => {
            span.textContent = index + 1;
            span.parentElement.setAttribute('aria-label', `Item ${index + 1}: ${span.parentElement.dataset.value}`);
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
        message.textContent = config.submitMessage;
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
        
        window.voiceflow.chat.interact({
          type: "complete",
          payload: { rankedOptions }
        });
      });

      element.appendChild(formContainer);

      if (typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(formContainer.querySelector('.rank-options-list'), {
          animation: 150,
          easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          handle: "li",  // Make the entire li element draggable
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd: updateRankNumbers,
          disabled: isSubmitted,
          delay: 50, // Small delay to improve experience on touch devices
          delayOnTouchOnly: true, // Only delay for touch devices
          forceFallback: false, // Better performance
          fallbackTolerance: 5, // Small threshold to start drag
          touchStartThreshold: 5,
          // Better performance on mobile
          supportPointer: true,  
          // Enhanced animation settings for smoothness
          animation: 150, 
          scroll: true,
          scrollSensitivity: 80,
          scrollSpeed: 20
        });
      }
      
      // Return cleanup function
      return () => {
        if (sortableInstance) {
          sortableInstance.destroy();
        }
      };
    };

    // Hide any scroll indicators that might be present
    hideScrollIndicators();

    let cleanup = null;
    
    if (typeof Sortable === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => {
        cleanup = createForm();
      };
      script.onerror = () => {
        console.error('Failed to load Sortable.js');
      };
      document.head.appendChild(script);
    } else {
      cleanup = createForm();
    }

    // Return cleanup function
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
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
    // Configuration options with defaults
    const config = {
      options: trace.payload?.options || [],
      maxSelections: trace.payload?.maxSelections || trace.payload?.options?.length || 0,
      color: trace.payload?.color || "#545857",
      title: trace.payload?.title || "Select your options",
      submitText: trace.payload?.submitText || "Submit",
      cancelText: trace.payload?.cancelText || "Cancel",
      darkMode: trace.payload?.darkMode || false,
      successMessage: trace.payload?.successMessage || "Your selection has been saved",
      slantTitle: trace.payload?.slantTitle || false,
      titleSkewDegree: trace.payload?.titleSkewDegree || -10
    };

    // Color utilities
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Function to adjust color brightness
    function adjustBrightness(hex, percent) {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      
      r = Math.max(0, Math.min(255, r + percent));
      g = Math.max(0, Math.min(255, g + percent));
      b = Math.max(0, Math.min(255, b + percent));
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Set color scheme based on dark mode preference
    const colors = {
      primary: config.color,
      primaryHover: adjustBrightness(config.color, config.darkMode ? 20 : -15),
      background: config.darkMode ? '#1E293B' : '#FFFFFF',
      surface: config.darkMode ? '#334155' : '#FFFFFF',
      text: config.darkMode ? '#F1F5F9' : '#303235',
      textSecondary: config.darkMode ? '#94A3B8' : '#72727a',
      border: config.darkMode ? '#475569' : 'rgba(0, 0, 0, 0.08)',
      hoverBg: config.darkMode ? '#475569' : 'rgba(0, 0, 0, 0.04)',
      error: '#FF4444'
    };

    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.className = "_1ddzqsn7";

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        
        ._1ddzqsn7 {
          display: block;
        }
        
        .multi-select-container {
          font-family: 'Inter', sans-serif;
          width: 100%;
          max-width: 450px;
          margin: 0 auto;
        }
        
        .multi-select-title {
          font-size: 15px;
          color: ${colors.textSecondary};
          margin-bottom: 14px;
          font-weight: 500;
          ${config.slantTitle ? `
            font-style: italic;
            transform: skewX(${config.titleSkewDegree}deg);
            display: inline-block;
            background: ${hexToRgba(config.color, 0.08)};
            padding: 6px 12px;
            border-radius: 4px;
            color: ${config.color};
            margin-left: -4px;
          ` : ''}
        }
        
        .multi-select-subtitle {
          font-size: 13px;
          color: ${colors.textSecondary};
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
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          cursor: pointer;
          : all 0.2s ease;
          user-select: none;
          opacity: 0;
          animation: slideIn 0.3s forwards;
        }
        
        .option-label:hover {
          border-color: ${colors.primary};
          transform: translateX(2px);
          background: ${colors.hoverBg};
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
          : all 0.2s ease;
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
          padding: 10px;
          background: ${hexToRgba(colors.error, 0.1)};
          border-radius: 6px;
          text-align: center;
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
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          : all 0.2s ease;
        }
        
        .submit-button {
          background: ${colors.primary};
          color: white;
          box-shadow: 0 2px 5px ${hexToRgba(colors.primary, 0.3)};
        }
        
        .submit-button:not(:disabled):hover {
          background: ${colors.primaryHover};
          transform: translateY(-1px);
          box-shadow: 0 4px 8px ${hexToRgba(colors.primary, 0.4)};
        }
        
        .submit-button:not(:disabled):active {
          transform: translateY(0);
        }
        
        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        .cancel-button {
          background: transparent;
          color: ${colors.textSecondary};
          border: 1px solid ${hexToRgba(colors.textSecondary, 0.2)};
        }
        
        .cancel-button:hover {
          background: ${hexToRgba(colors.textSecondary, 0.1)};
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
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
        
        /* Success state styling */
        .success-message {
          text-align: center;
          padding: 16px;
          margin-top: 16px;
          background: ${hexToRgba(colors.primary, 0.1)};
          border-radius: 8px;
          font-size: 14px;
          color: ${colors.text};
          border: 1px solid ${hexToRgba(colors.primary, 0.2)};
          display: none;
          animation: fadeIn 0.5s ease;
        }
        
        .success-icon {
          display: block;
          width: 36px;
          height: 36px;
          margin: 0 auto 12px;
          background: ${colors.primary};
          border-radius: 50%;
          position: relative;
          animation: scaleIn 0.4s cubic-bezier(0.18, 1.25, 0.6, 1.25) forwards;
          opacity: 0;
          transform: scale(0.5);
        }
        
        .success-icon:after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 16px;
          height: 8px;
          border: solid white;
          border-width: 0 0 2px 2px;
          transform: translate(-50%, -60%) rotate(-45deg);
        }
        
        .success-text {
          display: block;
          animation: fadeIn 0.5s ease forwards 0.2s;
          opacity: 0;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      </style>
      
      <div class="multi-select-container">
        <div class="multi-select-title">${config.title}</div>
        ${config.maxSelections < config.options.length ? 
          `<div class="multi-select-subtitle">Choose up to ${config.maxSelections} options</div>` : 
          ''}
        <div class="multi-select-options">
          ${config.options.map((option, index) => `
            <label class="option-label" style="animation-delay: ${index * 0.05}s">
              <input type="checkbox" class="checkbox-input" name="options" value="${option}">
              <div class="checkbox-wrapper"></div>
              <span class="option-text">${option}</span>
            </label>
          `).join('')}
        </div>
        <div class="error-message"></div>
        <div class="button-group">
          <button type="submit" class="submit-button" disabled>${config.submitText}</button>
          <button type="button" class="cancel-button">${config.cancelText}</button>
        </div>
        <div class="success-message">
          <div class="success-icon"></div>
          <span class="success-text">${config.successMessage}</span>
        </div>
      </div>
    `;

    let isSubmitted = false;
    const errorMessage = multiSelectContainer.querySelector(".error-message");
    const submitButton = multiSelectContainer.querySelector(".submit-button");
    const cancelButton = multiSelectContainer.querySelector(".cancel-button");
    const checkboxes = multiSelectContainer.querySelectorAll('input[type="checkbox"]');
    const successMessage = multiSelectContainer.querySelector(".success-message");

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
    
    const disableForm = () => {
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
    };
    
    const showSuccess = () => {
      successMessage.style.display = "block";
    };

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        if (isSubmitted) return;
        
        const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
        
        if (selectedCount > config.maxSelections) {
          checkbox.checked = false;
          showError(`You can select up to ${config.maxSelections} options`);
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
      disableForm();
      showSuccess();
      
      // Short delay before sending the interaction to allow the success state to be visible
      setTimeout(() => {
        window.voiceflow.chat.interact({
          type: "complete",
          payload: { options: selectedOptions }
        });
      }, 1200);
    });

    cancelButton.addEventListener("click", () => {
      if (isSubmitted) return;
      
      disableForm();
      
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { options: [] }
      });
    });

    element.innerHTML = '';
    element.appendChild(multiSelectContainer);
    
    // No cleanup needed since we're using separate extensions for input control
    return () => {};
  },
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
    element.appendChild(animationContainer);

    // Set up cleanup function
    const cleanup = () => {
      // Remove event listeners to prevent further clicks
      if (config.interactive) {
        container.removeEventListener('click', handleInteraction);
      }
      
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
      preventFutureDates: trace.payload?.preventFutureDates !== false,
      hideInputCompletely: trace.payload?.hideInputCompletely || false
    };
    
    // Create a unique ID for this instance
    const instanceId = `datepicker-${Date.now()}`;
    
    // ******* INPUT CONTROL MECHANISM *******
    // Create a CSS style block for input control
    const createInputControlStyles = () => {
      // Create unique ID to avoid conflicts
      const styleId = `vf-input-control-${Date.now()}`;
      
      // Check if style already exists
      if (document.getElementById(styleId)) return styleId;
      
      // Create style element
      const style = document.createElement('style');
      style.id = styleId;
      
      // CSS that targets multiple potential chat input selectors
      style.textContent = `
        /* Target standard Voiceflow selectors */
        .vfrc-input-container, 
        [class*="input-container"],
        
        /* Target Next.js potential class patterns */
        [class*="footer"] [class*="input"],
        [class*="chat"] [class*="input"],
        [class*="message"] [class*="form"],
        
        /* Target elements containing textareas or text inputs */
        div:has(> textarea),
        div:has(> input[type="text"]),
        form:has(> textarea),
        form:has(> input[type="text"]) {
          ${config.hideInputCompletely ? 'display: none !important;' : `
            opacity: 0.5 !important;
            pointer-events: none !important;
          `}
          transition: opacity 0.3s ease !important;
        }
        
        /* Target actual input elements */
        .vfrc-chat-input,
        textarea[class*="chat"],
        input[type="text"][class*="chat"],
        button[id*="send"],
        button[class*="send"],
        #vfrc-send-message {
          ${config.hideInputCompletely ? 'display: none !important;' : `
            opacity: 0.5 !important;
            pointer-events: none !important;
            background-color: #f5f5f5 !important;
          `}
        }
      `;
      
      // Add to document head
      document.head.appendChild(style);
      return styleId;
    };
    
    // Function to remove input control styles
    const removeInputControlStyles = (styleId) => {
      const styleElem = document.getElementById(styleId);
      if (styleElem) {
        styleElem.parentNode.removeChild(styleElem);
        return true;
      }
      return false;
    };
    
    // Disable inputs via CSS
    const styleId = createInputControlStyles();
    
    // Backup method: direct element manipulation if CSS approach fails
    const findAndDisableInputs = () => {
      try {
        // Common selectors that might contain the input area
        const inputSelectors = [
          ".vfrc-input-container",
          "[class*='input-container']",
          "[class*='footer'] [class*='input']",
          "form:has(textarea)",
          "div:has(> textarea)",
          "div:has(> input[type='text'])"
        ];
        
        // Try each selector
        for (const selector of inputSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(el => {
              if (config.hideInputCompletely) {
                el.style.display = "none";
              } else {
                el.style.opacity = "0.5";
                el.style.pointerEvents = "none";
              }
              
              // Also disable child inputs
              const inputs = el.querySelectorAll("textarea, input, button");
              inputs.forEach(input => {
                input.disabled = true;
                if (!config.hideInputCompletely) {
                  input.style.opacity = "0.5";
                  input.style.pointerEvents = "none";
                }
              });
            });
            
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.warn("Error in direct input disabling:", error);
        return false;
      }
    };
    
    // Try direct manipulation as a fallback
    findAndDisableInputs();
    
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
    
    // Style - Rest of your styles as before...
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
      /* Rest of styles as before */
      
      /* Add specific styles to ensure proper functioning in Next.js */
      #${instanceId} {
        z-index: 1000;
        position: relative;
      }
    `;
    
    // Create the container element and set up the widget
    // ... Rest of your implementation as before ...
    
    // Return a cleanup function that properly removes input control
    return () => {
      // Remove the CSS-based input control
      removeInputControlStyles(styleId);
      
      // Activate a mutation observer to ensure inputs are enabled
      // This helps with Next.js's asynchronous rendering
      const observer = new MutationObserver((mutations) => {
        // Look for changes that might bring back disabled inputs
        const inputContainers = document.querySelectorAll(".vfrc-input-container, [class*='input-container']");
        
        if (inputContainers.length > 0) {
          // Enable found input containers
          inputContainers.forEach(container => {
            container.style.display = "";
            container.style.opacity = "1";
            container.style.pointerEvents = "auto";
            
            // Enable child inputs
            const inputs = container.querySelectorAll("textarea, input, button");
            inputs.forEach(input => {
              input.disabled = false;
              input.style.opacity = "1";
              input.style.pointerEvents = "auto";
              input.style.backgroundColor = "";
            });
          });
          
          observer.disconnect();
        }
      });
      
      // Start observing for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      
      // Set a timeout to disconnect the observer after a reasonable time
      setTimeout(() => observer.disconnect(), 2000);
    };
  }
};
  }
};
