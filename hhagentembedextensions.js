export const DelayEffectExtension = {
  name: "DelayEffect",
  type: "effect",
  match: ({ trace }) => trace.type === "ext_delay" || trace.payload?.name === "ext_delay",
  effect: async ({ trace }) => {
    try {
      // Get delay value (default: 9000ms)
      const delay = Math.max(0, parseInt(trace.payload?.delay) || 9000);
      
      // Disable chat inputs during delay
      const toggleInputs = (disable) => {
        const chatDiv = document.getElementById("voiceflow-chat");
        if (!chatDiv?.shadowRoot) return;
        
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
          
          // Disable interactive elements
          chatDiv.shadowRoot.querySelectorAll("button, input, textarea").forEach(el => {
            if (inputContainer.contains(el)) el.disabled = disable;
          });
        }
      };

      // Create and show processing indicator
      const createIndicator = () => {
        const chatContainer = document.querySelector('.vfrc-chat-messages');
        if (!chatContainer) return null;
        
        const indicator = document.createElement('div');
        indicator.innerHTML = `
          <style>
            .delay-indicator {
              padding: 14px 16px;
              margin: 10px 0;
              background: rgba(84, 88, 87, 0.05);
              border-radius: 12px;
              font-family: system-ui, sans-serif;
              font-size: 14px;
              color: #555;
              max-width: 240px;
            }
            
            .delay-text {
              display: flex;
              align-items: center;
              font-weight: 500;
            }
            
            .typing-dots {
              display: flex;
              margin-left: 4px;
            }
            
            .dot {
              width: 4px;
              height: 4px;
              margin: 0 2px;
              border-radius: 50%;
              background: currentColor;
            }
            
            .dot:nth-child(1) { animation: bounce 1.4s infinite 0s; }
            .dot:nth-child(2) { animation: bounce 1.4s infinite 0.2s; }
            .dot:nth-child(3) { animation: bounce 1.4s infinite 0.4s; }
            
            @keyframes bounce {
              0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
              30% { transform: translateY(-4px); opacity: 1; }
            }
            
            .progress-container {
              width: 100%;
              height: 3px;
              margin-top: 8px;
              background: #eee;
              border-radius: 3px;
              overflow: hidden;
            }
            
            .progress-bar {
              height: 100%;
              width: 0%;
              background: #555;
              border-radius: 3px;
            }
          </style>
          <div class="delay-indicator">
            <div class="delay-text">
              Processing
              <div class="typing-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
            <div class="progress-container">
              <div class="progress-bar"></div>
            </div>
          </div>
        `;
        
        chatContainer.appendChild(indicator);
        
        // Start progress animation
        const progressBar = indicator.querySelector('.progress-bar');
        setTimeout(() => {
          progressBar.style.transition = `width ${delay}ms linear`;
          progressBar.style.width = '100%';
        }, 10);
        
        // Auto-scroll to show indicator
        setTimeout(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 50);
        
        return indicator;
      };

      // Disable inputs and show indicator
      toggleInputs(true);
      const indicator = createIndicator();
      
      // Wait for specified delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Remove indicator
      if (indicator) indicator.remove();
      
      // Re-enable inputs
      toggleInputs(false);
      
      // Continue to next block
      window.voiceflow.chat.interact({ type: "complete" });
      
    } catch (error) {
      console.error('DelayEffect Extension Error:', error);
      
      // Clean up on error
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container");
        if (inputContainer) {
          inputContainer.style.opacity = "1";
          inputContainer.style.pointerEvents = "auto";
        }
      }
      
      // Continue to next block even if there's an error
      window.voiceflow.chat.interact({ type: "complete" });
    }
  }
};

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

export const RankOptionsExtension = {
  name: "RankOptions",
  type: "response",
  match: ({ trace }) => 
    trace.type === "ext_rankoptions" || trace.payload?.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    // Get options and configuration from payload
    const options = trace.payload?.options || [];
    const primaryColor = trace.payload?.color || "#545857";
    const title = trace.payload?.title || "Drag and drop to rank in order of preference";
    const submitText = trace.payload?.submitText || "Submit";
    const submitMessage = trace.payload?.submitMessage || "Rankings submitted";
    const darkMode = trace.payload?.darkMode || false;
    
    // Determine colors based on mode and primary color
    const colors = {
      primary: primaryColor,
      text: darkMode ? "#E2E8F0" : "#303235",
      background: darkMode ? "#1E293B" : "#FFFFFF",
      surface: darkMode ? "#334155" : "#FFFFFF",
      border: darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
      secondaryText: darkMode ? "#94A3B8" : "#72727a",
      buttonHover: adjustColor(primaryColor, 10),
      shadow: darkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)"
    };

    // Function to lighten/darken a hex color
    function adjustColor(color, percent) {
      if (!color.startsWith('#')) return color;
      
      // Convert hex to RGB
      let r = parseInt(color.substring(1, 3), 16);
      let g = parseInt(color.substring(3, 5), 16);
      let b = parseInt(color.substring(5, 7), 16);
      
      // Lighten or darken
      r = Math.min(255, Math.max(0, r + percent));
      g = Math.min(255, Math.max(0, g + percent));
      b = Math.min(255, Math.max(0, b + percent));
      
      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

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
              el.style.backgroundColor = disable ? (darkMode ? "#2D3748" : "#f5f5f5") : "";
            }
          });
        });
      }
    };

    // Hide any scroll indicators
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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
          
          ._1ddzqsn7 {
            display: block;
          }
          
          .rank-options-container {
            font-family: 'Inter', sans-serif;
            padding: 0;
            width: 100%;
            color: ${colors.text};
          }
          
          .rank-title {
            font-size: 14px;
            margin-bottom: 12px;
            color: ${colors.secondaryText};
            font-weight: 500;
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
            border-color: ${colors.primary}40;
            box-shadow: 0 2px 4px ${colors.shadow};
            transform: translateX(2px);
          }
          
          .rank-options-list li:hover:before {
            opacity: 1;
          }
          
          .rank-options-list li:active {
            cursor: grabbing;
            background-color: ${darkMode ? '#2D3748' : '#f8f9fa'};
            transform: scale(1.02);
          }

          .rank-options-list.disabled li {
            cursor: not-allowed;
            opacity: 0.7;
            pointer-events: none;
          }

          .rank-number {
            min-width: 24px;
            color: ${colors.secondaryText};
            font-size: 14px;
            font-weight: 500;
            margin-right: 10px;
            user-select: none;
            transition: color 0.2s ease;
          }
          
          li:hover .rank-number {
            color: ${colors.primary};
          }
          
          .rank-text {
            flex: 1;
            padding-right: 4px;
            line-height: 1.4;
          }
          
          .submit-button {
            width: 100%;
            padding: 12px 16px;
            background-color: ${colors.primary};
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 16px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .submit-button:not(:disabled):hover {
            background-color: ${colors.buttonHover};
            transform: translateY(-1px);
            box-shadow: 0 2px 4px ${colors.shadow};
          }
          
          .submit-button:not(:disabled):active {
            transform: translateY(0);
          }

          .submit-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: ${colors.secondaryText};
          }
          
          .sortable-ghost {
            opacity: 0.3;
            background: ${darkMode ? '#2D3748' : '#f5f5f5'};
            border: 2px dashed ${colors.primary};
          }

          .sortable-drag {
            background-color: ${colors.surface};
            box-shadow: 0 4px 8px ${colors.shadow};
            border-color: ${colors.primary};
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
            background: ${colors.text};
            border-radius: 1px;
          }

          li:hover .rank-handle {
            opacity: 0.6;
          }

          .submitted-message {
            color: ${colors.secondaryText};
            font-size: 13px;
            text-align: center;
            margin-top: 12px;
            font-style: italic;
          }
          
          /* Remove any down arrows */
          [class*="scroll-down"],
          [class*="scroll-button"] {
            display: none !important;
          }
        </style>
        
        <div class="rank-options-container">
          <div class="rank-title">${title}</div>
          <ul class="rank-options-list">
            ${options.map((option, index) => `
              <li data-value="${option}" style="--item-index: ${index}">
                <span class="rank-number">${index + 1}</span>
                <span class="rank-text">${option}</span>
                <div class="rank-handle"></div>
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
