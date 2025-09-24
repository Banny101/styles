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
      slantTitle: trace.payload?.slantTitle || false,
      titleSkewDegree: trace.payload?.titleSkewDegree || -10,
      autoScroll: trace.payload?.autoScroll !== false, // Default to true
      preserveScrollIndicators: trace.payload?.preserveScrollIndicators !== false // Default to true
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

    // IMPROVED: Only hide scroll indicators if explicitly configured to do so
    const manageScrollIndicators = (action) => {
      if (!config.preserveScrollIndicators) {
        document.querySelectorAll('[class*="scroll-down"], [class*="scroll-button"]')
          .forEach(el => {
            el.style.display = action === 'hide' ? 'none' : '';
          });
      }
    };

    // NEW: Auto-scroll function to make component visible
    const scrollIntoView = () => {
      if (config.autoScroll) {
        try {
          // First try smooth scrolling the container
          const chatContainer = document.querySelector('.vfrc-chat-container') || 
                               document.querySelector('[class*="chat-container"]');
          
          if (chatContainer) {
            // Scroll to the bottom with a slight delay to ensure rendering
            setTimeout(() => {
              chatContainer.scrollTop = chatContainer.scrollHeight;
              console.log("Scrolled chat container to bottom");
            }, 100);
          }
          
          // Then directly scroll to our element as a backup
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            console.log("Scrolled element into view");
          }, 200);
        } catch (err) {
          console.warn("Auto-scroll error:", err);
        }
      }
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
            /* Added bottom margin to ensure space below */
            margin-bottom: 16px;
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
            /* Added min-height to ensure rendering before items appear */
            min-height: 100px;
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

          /* Modified to reduce animation delay and ensure initial visibility */
          .rank-options-list li {
            animation: slideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            animation-delay: calc(var(--item-index) * 0.05s);
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
          
          /* REMOVED: No longer hiding scroll indicators in CSS */
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

    // Load Sortable.js if needed, then create form
    let cleanup = null;
    
    if (typeof Sortable === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => {
        cleanup = createForm();
        // NEW: Auto-scroll after form created with a slight delay to allow rendering
        setTimeout(scrollIntoView, 100);
      };
      script.onerror = () => {
        console.error('Failed to load Sortable.js');
      };
      document.head.appendChild(script);
    } else {
      cleanup = createForm();
      // NEW: Auto-scroll after form created
      setTimeout(scrollIntoView, 100);
    }

    // Set up a repeated scroll check to handle delayed rendering
    const scrollCheckInterval = setInterval(() => {
      scrollIntoView();
    }, 500);
    
    // Clear interval after a few seconds
    setTimeout(() => {
      clearInterval(scrollCheckInterval);
    }, 2000);

    // Return cleanup function
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
      clearInterval(scrollCheckInterval);
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
      titleSkewDegree: trace.payload?.titleSkewDegree || -10,
      successDuration: trace.payload?.successDuration || 1000 // Reduced to 1 second
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
    multiSelectContainer.className = "_1ddzqsn7 multi-select-wrapper";
    multiSelectContainer.id = `multiSelect-${Date.now()}`;

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        
        ._1ddzqsn7.multi-select-wrapper {
          display: block;
          margin-bottom: 20px;
          position: relative;
        }
        
        .multi-select-container {
          font-family: 'Inter', sans-serif;
          width: 100%;
          max-width: 450px;
          margin: 0 auto;
          position: relative;
          transition: all 0.3s ease;
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
          transition: all 0.2s ease;
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
          transition: all 0.2s ease;
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
        
        /* Improved success overlay */
        .success-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${hexToRgba(colors.background, 0.95)};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          opacity: 0;
          pointer-events: none;
          z-index: 10;
          transition: opacity 0.3s ease;
          border-radius: 8px;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .success-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }
        
        .success-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          background: ${hexToRgba(colors.primary, 0.15)};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: scaleIn 0.5s cubic-bezier(0.18, 1.25, 0.6, 1.25) forwards;
          opacity: 0;
        }
        
        .success-icon:after {
          content: '';
          display: block;
          width: 20px;
          height: 10px;
          border: solid ${colors.primary};
          border-width: 0 0 3px 3px;
          transform: rotate(-45deg) translate(2px, -2px);
        }
        
        .success-text {
          font-size: 16px;
          font-weight: 600;
          color: ${colors.text};
          text-align: center;
          opacity: 0;
          animation: fadeIn 0.5s ease forwards 0.3s;
        }
        
        .selected-items {
          margin-top: 12px;
          padding: 12px;
          background: ${hexToRgba(colors.primary, 0.1)};
          border-radius: 8px;
          max-width: 100%;
          text-align: center;
          opacity: 0;
          animation: fadeIn 0.5s ease forwards 0.5s;
        }
        
        .selected-items-title {
          font-size: 13px;
          font-weight: 500;
          color: ${colors.textSecondary};
          margin-bottom: 8px;
        }
        
        .selected-item {
          display: inline-block;
          margin: 4px;
          padding: 6px 10px;
          background: ${hexToRgba(colors.primary, 0.15)};
          color: ${colors.primary};
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
        
        <!-- Improved success overlay -->
        <div class="success-overlay">
          <div class="success-icon"></div>
          <div class="success-text">${config.successMessage}</div>
          <div class="selected-items">
            <div class="selected-items-title">Your selections:</div>
            <div class="selected-items-list"></div>
          </div>
        </div>
      </div>
    `;

    element.innerHTML = '';
    element.appendChild(multiSelectContainer);

    // Get DOM elements
    let isSubmitted = false;
    let hasInteracted = false; // Flag to track if we've sent the interaction
    const errorMessage = multiSelectContainer.querySelector(".error-message");
    const submitButton = multiSelectContainer.querySelector(".submit-button");
    const cancelButton = multiSelectContainer.querySelector(".cancel-button");
    const checkboxes = multiSelectContainer.querySelectorAll('input[type="checkbox"]');
    const successOverlay = multiSelectContainer.querySelector(".success-overlay");
    const selectedItemsList = multiSelectContainer.querySelector(".selected-items-list");
    
    // Auto-scroll function to ensure component is visible
    const scrollIntoView = () => {
      try {
        setTimeout(() => {
          const chatContainer = document.querySelector('.vfrc-chat-container') || 
                               document.querySelector('[class*="chat-container"]');
          
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
          
          multiSelectContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } catch (err) {
        console.warn("Scroll error:", err);
      }
    };
    
    // Call scroll function on initial render
    scrollIntoView();

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
        checkbox.parentElement.style.pointerEvents = "none";
      });
      
      submitButton.disabled = true;
      cancelButton.disabled = true;
      
      // Add visual indication that form is disabled
      submitButton.style.opacity = "0.5";
      cancelButton.style.opacity = "0.5";
    };
    
    const showSuccess = (selectedOptions) => {
      // Fill the selected items list
      selectedItemsList.innerHTML = selectedOptions.length > 0 
        ? selectedOptions.map(option => `<span class="selected-item">${option}</span>`).join('')
        : '<span class="selected-item">None selected</span>';
      
      // Display the success overlay with animation
      successOverlay.classList.add("visible");
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
      if (isSubmitted || hasInteracted) return;

      const selectedOptions = Array.from(
        multiSelectContainer.querySelectorAll('input[name="options"]:checked')
      ).map(input => input.value);

      // Mark as submitted to prevent duplicate submissions
      isSubmitted = true;
      
      // Disable the form controls
      disableForm();
      
      // Show success state with selected options
      showSuccess(selectedOptions);
      
      // IMPORTANT FIX: Send the interact call immediately after a brief delay
      // This ensures the flow continues to the next block
      setTimeout(() => {
        if (!hasInteracted) {
          hasInteracted = true;
          console.log("MultiSelect: Sending complete interaction with options:", selectedOptions);
          
          window.voiceflow.chat.interact({
            type: "complete",
            payload: { options: selectedOptions }
          });
        }
      }, 300); // Short delay to allow success state to appear
    });

    cancelButton.addEventListener("click", () => {
      if (isSubmitted || hasInteracted) return;
      
      hasInteracted = true;
      disableForm();
      
      console.log("MultiSelect: Sending cancel interaction");
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { options: [] }
      });
    });
    
    // Return a cleanup function
    return () => {
      // If we haven't yet interacted but we're being cleaned up, force an interaction
      if (isSubmitted && !hasInteracted) {
        const selectedOptions = Array.from(
          multiSelectContainer.querySelectorAll('input[name="options"]:checked')
        ).map(input => input.value);
        
        console.log("MultiSelect cleanup: Forcing interaction with options:", selectedOptions);
        
        window.voiceflow.chat.interact({
          type: "complete",
          payload: { options: selectedOptions }
        });
      }
    };
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
      
      /* Single button container (removed the grid) */
      .buttons {
        display: flex;
        justify-content: center;
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
        width: 100%; /* Make the button full width */
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

      /* Added to make sure component is visible */
      .datepicker-container {
        margin-bottom: 16px;
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
          
          <!-- Only the confirm button, no cancel button -->
          <div class="buttons">
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
    
    // Auto-scroll function to make sure component is visible
    const scrollIntoView = () => {
      try {
        // First try scrolling container
        const chatContainer = document.querySelector('.vfrc-chat-container') || 
                             document.querySelector('[class*="chat-container"]');
        
        if (chatContainer) {
          setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }, 100);
        }
        
        // Then scroll directly to our element
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      } catch (err) {
        console.warn("Auto-scroll error:", err);
      }
    };
    
    // Call the scroll function
    scrollIntoView();
    
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
    
    // Implement keyboard navigation - only for Enter, removed Escape
    container.addEventListener('keydown', (e) => {
      if (isCompleted || isProcessing) return;
      
      if (e.key === 'Enter' && !confirmButton.disabled) {
        e.preventDefault();
        confirmButton.click();
      }
    });
    
    // Set up periodic scroll checks to ensure visibility
    const scrollInterval = setInterval(scrollIntoView, 500);
    setTimeout(() => clearInterval(scrollInterval), 2000);
    
    // Empty cleanup function
    return () => {
      clearInterval(scrollInterval);
    };
  }
};
