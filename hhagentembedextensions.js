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
        font-family: 'Inter', sans-serif;
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
        letter-spacing: -0.01em;
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
              el.style.backgroundColor = disable ? (config.darkMode ? "#2D3748" : "#f5f5f5") : "";
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
