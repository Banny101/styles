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
