export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) =>
    trace.type === "ext_browserData" ||
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    // WARNING: This relies on querying Voiceflow's internal DOM structure.
    // Class names like '.vfrc-chat-messages' might change in future widget updates,
    // potentially breaking this loading indicator.
    const showLoadingIndicator = () => {
      const chatContainer = document.querySelector('.vfrc-chat-messages');
      if (!chatContainer) {
        console.warn("BrowserData Extension: Could not find chat container '.vfrc-chat-messages'.");
        return null;
      }

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
        const result = await fn();
        // Handle cases where functions might return undefined/null intentionally
        return result !== undefined && result !== null ? result : fallback;
      } catch (error) {
        console.warn(`BrowserData Extension: Error during safeExecute - ${error.message}`);
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

      // Basic browser detection patterns (Consider a library like ua-parser-js for more accuracy if needed)
      const patterns = [
        { name: "Edge", regex: /edg\/([\d.]+)/i },
        { name: "Chrome", regex: /chrome\/([\d.]+)/i },
        { name: "Firefox", regex: /firefox\/([\d.]+)/i },
        { name: "Safari", regex: /version\/([\d.]+).*safari/i },
        { name: "Opera", regex: /opr\/([\d.]+)/i },
        { name: "IE", regex: /(msie\s|rv:)([\d.]+)/i }
      ];
      for (const pattern of patterns) {
        const match = userAgent.match(pattern.regex);
        if (match) {
          browserData.browserName = pattern.name;
          browserData.browserVersion = match[1];
          break;
        }
      }

      // Basic engine detection
      const enginePatterns = [
        { name: "Blink", regex: /chrome\//i }, // Often indicates Blink
        { name: "Gecko", regex: /gecko\//i },
        { name: "WebKit", regex: /webkit\//i },
        { name: "Trident", regex: /trident\//i } // IE
      ];
      for (const pattern of enginePatterns) {
        if (pattern.regex.test(userAgent)) {
          browserData.engine = pattern.name;
           // Attempt to get version (might not always be present or accurate)
          const versionMatch = userAgent.match(new RegExp(`${pattern.name}\\/([\\d.]+)`, 'i'));
          browserData.engineVersion = versionMatch?.[1] || "Unknown";
          break;
        }
      }
      // Fallback for WebKit version specifically in Safari
      if (browserData.engine === "WebKit" && browserData.browserName === "Safari") {
         const webkitMatch = userAgent.match(/webkit\/([\d.]+)/i);
         browserData.engineVersion = webkitMatch?.[1] || browserData.engineVersion;
      }


      return browserData;
    };

    // System Capabilities
    const getSystemCapabilities = () => ({
      cookiesEnabled: navigator.cookieEnabled,
      // WARNING: navigator.javaEnabled() is deprecated and unreliable.
      javaEnabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : "Deprecated",
      // NOTE: Do Not Track has very low adoption and effect.
      doNotTrack: navigator.doNotTrack ?? "Unknown", // Use ?? for nullish coalescing
      touchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || "Unknown",
      // WARNING: navigator.deviceMemory is experimental and not widely supported.
      deviceMemory: (navigator as any).deviceMemory || "Unknown", // Use 'as any' if TS complains
      platform: navigator.platform || "Unknown",
      vendor: navigator.vendor || "Unknown",
      onLine: navigator.onLine,
      // WARNING: navigator.connection is experimental and support varies.
      connectionType: (navigator as any).connection?.type || "Unknown",
      connectionSpeed: (navigator as any).connection?.effectiveType || "Unknown",
      batteryLevel: null, // Will be populated if available (but see getBatteryInfo warning)
      deviceType: detectDeviceType(),
    });

    // Detect device type (basic detection)
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

    // WARNING: navigator.getBattery() is deprecated and support is being removed
    // from major browsers due to privacy concerns. This will likely fail or return
    // inaccurate/default data in many modern environments.
    const getBatteryInfo = async () => {
      if (typeof (navigator as any).getBattery === 'function') {
        try {
          const battery = await (navigator as any).getBattery();
          return {
            level: battery.level,
            charging: battery.charging,
            // These might return Infinity or 0 depending on state/support
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          };
        } catch (batteryError) {
           console.warn("BrowserData Extension: Failed to get battery info (likely deprecated/unsupported).", batteryError);
           return null;
        }
      }
      return null;
    };

    // Screen and Viewport Information
    const getDisplayInfo = () => {
      const screen = window.screen;
      return {
        screenResolution: `${screen.width}x${screen.height}`,
        screenColorDepth: screen.colorDepth,
        screenPixelRatio: window.devicePixelRatio || 1,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        viewportOrientation: screen?.orientation?.type || "Unknown",
        isFullScreen: !!document.fullscreenElement, // Use boolean coercion
        isReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
        prefersColorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      };
    };

    // Location and Time Information
    const getLocationInfo = () => {
      const timeZone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || "Unknown";
      return {
        url: window.location?.href || "Unknown",
        protocol: window.location?.protocol || "Unknown",
        hostname: window.location?.hostname || "Unknown",
        pathname: window.location?.pathname || "Unknown",
        queryParams: Object.fromEntries(new URLSearchParams(window.location?.search || "")),
        hash: window.location?.hash || "",
        timeZone,
        locale: navigator.language || "Unknown",
        languages: navigator.languages || [],
        timestamp: Date.now(),
        timezoneOffset: new Date().getTimezoneOffset(),
        formattedDate: new Date().toLocaleString(),
        // WARNING: document.referrer can be empty or unreliable due to browser policies.
        referrer: document.referrer || "Unknown",
      };
    };

    // WARNING: Accessing all cookies can expose sensitive session information if
    // HttpOnly flag is not properly set server-side. Only read specific, necessary
    // cookies if possible. This implementation reads all accessible cookies.
    const getCookieInfo = () => {
      const cookies: { [key: string]: string } = {};
      if (document.cookie) {
        try {
          document.cookie.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            const name = parts[0]?.trim();
            if (name) {
                // Decode cookie value in case it's encoded
                const value = parts.slice(1).join('='); // Handle values containing '='
                try {
                    cookies[name] = decodeURIComponent(value);
                } catch (e) {
                    // If decoding fails, store the raw value
                    cookies[name] = value;
                    console.warn(`BrowserData Extension: Failed to decode cookie value for ${name}`);
                }
            }
          });
        } catch (e) {
            console.warn("BrowserData Extension: Error parsing document.cookie", e);
        }
      }
      return cookies;
    };

    // Get IP Address using external services
    const getIpAddress = async () => {
      // NOTE: Relies on third-party services. Availability/accuracy may vary.
      // Consider privacy implications of sending requests to these services.
      const services = [
        'https://api.ipify.org?format=json', // Simple, often reliable
        'https://ipapi.co/json/',            // Provides more geo info if needed
        // 'https://api.myip.com', // Check format if used
        // 'https://api.db-ip.com/v2/free/self' // Check format if used
      ];

      for (const service of services) {
        try {
          const response = await fetch(service, { method: 'GET', cache: 'no-cache' }); // Avoid caching IP
          if (response.ok) {
            const data = await response.json();
            // Adapt based on the specific API's response structure
            return data.ip || data.ipAddress || data.address || "Unknown from service";
          }
        } catch (e) {
          console.warn(`BrowserData Extension: IP service ${service} failed: ${(e as Error).message}`);
        }
      }
      // If all services fail
      console.warn("BrowserData Extension: All IP lookup services failed.");
      return "Unknown";
    };

    // --- Main Execution ---
    let loadingIndicator: HTMLDivElement | null = null;
    try {
      loadingIndicator = showLoadingIndicator();

      // Collect all data using safeExecute and Promise.all
      const batteryInfoPromise = safeExecute(getBatteryInfo, null);
      const systemCapsPromise = safeExecute(getSystemCapabilities, {});
      const ipAddressPromise = safeExecute(getIpAddress, "Unknown");
      const browserInfoPromise = safeExecute(getBrowserInfo, {});
      const displayInfoPromise = safeExecute(getDisplayInfo, {});
      const locationInfoPromise = safeExecute(getLocationInfo, {});
      const cookieInfoPromise = safeExecute(getCookieInfo, {});

      const [
          batteryInfo,
          systemCaps,
          ipAddress,
          browserInfo,
          displayInfo,
          locationInfo,
          cookieInfo
      ] = await Promise.all([
          batteryInfoPromise,
          systemCapsPromise,
          ipAddressPromise,
          browserInfoPromise,
          displayInfoPromise,
          locationInfoPromise,
          cookieInfoPromise
      ]);

      // Combine system capabilities with battery info if available
      if (batteryInfo && typeof batteryInfo === 'object') {
         (systemCaps as any).batteryLevel = (batteryInfo as any).level ?? null; // Use nullish coalescing
         (systemCaps as any).batteryCharging = (batteryInfo as any).charging ?? null;
         // Optionally add charging/discharging times if needed
      }


      const browserData = {
        ip: ipAddress,
        browser: browserInfo,
        system: systemCaps,
        display: displayInfo,
        location: locationInfo,
        cookies: cookieInfo, // Be mindful of privacy
        userAgent: navigator.userAgent || "Unknown",
        collected_at: new Date().toISOString()
      };

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

      // Ensure loading indicator is removed on error too
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      // Send error back to chat
      window.voiceflow.chat.interact({
        type: "complete",
        payload: {
          error: true,
          message: `Failed to collect browser data: ${(error as Error).message}`,
          collected_at: new Date().toISOString()
        }
      });
    }
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
      // Use radix 10 for parsing integers
      maxYear: parseInt(trace.payload?.maxYear, 10) || new Date().getFullYear(),
      minYear: parseInt(trace.payload?.minYear, 10) || 1900,
      ageLabel: trace.payload?.ageLabel || "Your age",
      darkMode: trace.payload?.darkMode || false,
      preventFutureDates: trace.payload?.preventFutureDates !== false // Default true
    };

    // Validate year range
    if (config.minYear > config.maxYear) {
      console.warn("CalendarDatePicker: minYear is greater than maxYear. Swapping them.");
      [config.minYear, config.maxYear] = [config.maxYear, config.minYear];
    }

    // Create a unique ID for this instance
    const instanceId = `datepicker-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Helper functions
    const calculateAge = (birthdate: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - birthdate.getFullYear();
      const monthDiff = today.getMonth() - birthdate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
      }
      return age;
    };

    const isFutureDate = (year: number, month: number, day: number): boolean => {
      if (!config.preventFutureDates) return false;
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to the start of the day
      return date > today;
    };

    const formatDate = (year: number, month: number, day: number): string => {
      // Ensure month and day are padded (month is 1-based here)
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    };

    // Color utilities
    const hexToRgba = (hex: string, alpha = 1): string => {
        // Allow shorthand hex codes
        if (hex.length === 4) {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }
        if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            console.warn(`Invalid hex color: ${hex}. Using default.`);
            hex = '#4F46E5'; // Default fallback
        }
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
      successLight: hexToRgba('#10B981', 0.1),
      error: '#EF4444',
      errorLight: hexToRgba('#EF4444', 0.1),
      errorBorder: hexToRgba('#EF4444', 0.2),
    };

    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

    // Style
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

      #${instanceId} .datepicker-container { /* Scope styles to instance ID */
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

      #${instanceId} .datepicker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: ${config.title ? '14px 16px' : '0'};
        background: ${colors.surface};
        border-bottom: ${config.title ? `1px solid ${colors.border}` : 'none'};
      }

      #${instanceId} .datepicker-title {
        font-size: 15px;
        font-weight: 600;
        color: ${colors.text};
        letter-spacing: -0.01em;
      }

      #${instanceId} .datepicker-body {
        padding: 16px;
        position: relative;
      }

      /* Custom dropdown styling */
      #${instanceId} .select-container {
        position: relative;
        margin-bottom: 16px;
      }

      #${instanceId} .select-label {
        font-size: 13px;
        font-weight: 500;
        color: ${colors.textSecondary};
        margin-bottom: 6px;
        display: block;
      }

      #${instanceId} .custom-select {
        width: 100%;
        padding: 12px 14px;
        font-size: 14px;
        font-weight: 500;
        color: ${colors.text};
        background: ${colors.surface};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        appearance: none;
        -webkit-appearance: none; /* Safari */
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Inter', system-ui, sans-serif;
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23${colors.primary.substring(1)}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
        background-repeat: no-repeat;
        background-position: right 14px center;
        background-size: 10px 6px;
        padding-right: 35px; /* Make space for arrow */
      }

      #${instanceId} .custom-select:focus {
        outline: none;
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 2px ${hexToRgba(config.primaryColor, 0.2)};
      }

      #${instanceId} .custom-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background-color: ${config.darkMode ? '#475569' : '#F1F5F9'};
      }

      /* Results display */
      #${instanceId} .date-summary {
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

      #${instanceId} .date-summary.has-date {
        border-color: ${hexToRgba(config.primaryColor, 0.3)};
        background: ${hexToRgba(config.primaryColor, 0.05)};
      }

      #${instanceId} .age-display {
        text-align: center;
        padding: 12px;
        background: ${hexToRgba(config.primaryColor, 0.1)};
        color: ${config.primaryColor};
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        display: none; /* Initially hidden */
        animation: fadeIn 0.3s ease;
        border: 1px solid ${hexToRgba(config.primaryColor, 0.15)};
        margin-bottom: 16px;
      }

      #${instanceId} .error-text {
        text-align: center;
        padding: 12px;
        background: ${colors.errorLight};
        color: ${colors.error};
        border-radius: 12px;
        font-size: 14px;
        margin-bottom: 16px;
        border: 1px solid ${colors.errorBorder};
        display: none; /* Initially hidden */
        animation: fadeIn 0.3s ease;
      }

      /* Success state */
      #${instanceId} .success-state {
        display: none; /* Initially hidden */
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

      #${instanceId} .success-content {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      #${instanceId} .success-icon {
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

       #${instanceId} .success-icon svg path {
            stroke: ${colors.success}; /* Ensure icon color matches */
       }

      #${instanceId} .success-message {
        font-size: 16px;
        font-weight: 600;
        color: ${colors.text};
        margin-bottom: 8px;
        animation: fadeUp 0.3s ease forwards 0.2s;
        opacity: 0;
        transform: translateY(10px);
      }

      #${instanceId} .success-details {
        font-size: 14px;
        color: ${colors.textSecondary};
        animation: fadeUp 0.3s ease forwards 0.3s;
        opacity: 0;
        transform: translateY(10px);
      }

      /* Processing overlay */
      #${instanceId} .processing-overlay {
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

      #${instanceId} .processing-overlay.active {
        opacity: 1;
        pointer-events: all;
      }

      #${instanceId} .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid ${hexToRgba(config.primaryColor, 0.2)};
        border-radius: 50%;
        border-top-color: ${config.primaryColor};
        animation: spin 1s linear infinite;
      }

      /* Buttons */
      #${instanceId} .buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      #${instanceId} .btn {
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
        overflow: hidden; /* For ripple */
      }

      /* Basic ripple effect */
      #${instanceId} .btn::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 5px;
        height: 5px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        transition: transform 0.4s ease-out, opacity 0.4s ease-out;
        pointer-events: none;
        opacity: 0;
      }

      #${instanceId} .btn:active::after {
        transform: translate(-50%, -50%) scale(100); /* Adjust scale factor as needed */
        opacity: 1;
        transition: transform 0s, opacity 0s; /* Immediate effect on press */
      }
       /* Reset ripple after release */
      #${instanceId} .btn:not(:active)::after {
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          transition: transform 0.4s ease-out, opacity 0.4s ease-out;
       }


      #${instanceId} .btn-cancel {
        background: ${colors.surface};
        color: ${colors.textSecondary};
        border: 1px solid ${colors.border};
      }

      #${instanceId} .btn-cancel:hover:not(:disabled) {
        background: ${config.darkMode ? '#475569' : '#E2E8F0'};
      }

      #${instanceId} .btn-confirm {
        background: ${config.primaryColor};
        color: white;
        box-shadow: 0 2px 5px ${hexToRgba(config.primaryColor, 0.4)};
      }

      #${instanceId} .btn-confirm:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px ${hexToRgba(config.primaryColor, 0.5)};
      }

      #${instanceId} .btn-confirm:active:not(:disabled) {
        transform: translateY(0);
      }

      #${instanceId} .btn:disabled { /* General disabled style */
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

      #${instanceId} .highlight-animation {
        animation: highlight-${instanceId} 0.5s ease;
      }

      @keyframes highlight-${instanceId} {
        0% { background: ${hexToRgba(config.primaryColor, 0.2)}; }
        100% { background: ${hexToRgba(config.primaryColor, 0.05)}; }
      }
    `;

    // Create the container element
    const container = document.createElement('div');
    container.id = instanceId; // Use unique ID for the main container

    // Set initial state
    let selectedYear: number | null = null;
    let selectedMonth: number | null = null; // 0-indexed
    let selectedDay: number | null = null;
    let selectedDate: Date | null = null;
    let isProcessing = false;
    let isCompleted = false;

    // Get days in month
    const getDaysInMonth = (year: number, month: number): number => {
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
            <label for="${instanceId}-month-select" class="select-label">Month</label>
            <select id="${instanceId}-month-select" class="custom-select">
              <option value="" disabled selected>Select month</option>
              ${monthNames.map((month, index) =>
                `<option value="${index}">${month}</option>`
              ).join('')}
            </select>
          </div>

          <!-- Day Dropdown -->
          <div class="select-container">
            <label for="${instanceId}-day-select" class="select-label">Day</label>
            <select id="${instanceId}-day-select" class="custom-select" disabled>
              <option value="" disabled selected>Select day</option>
            </select>
          </div>

          <!-- Year Dropdown -->
          <div class="select-container">
            <label for="${instanceId}-year-select" class="select-label">Year</label>
            <select id="${instanceId}-year-select" class="custom-select">
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

    // Append to the element provided by Voiceflow
    element.appendChild(container);

    // Get DOM elements (scope queries within the container)
    const monthSelect = container.querySelector(`#${instanceId}-month-select`) as HTMLSelectElement;
    const daySelect = container.querySelector(`#${instanceId}-day-select`) as HTMLSelectElement;
    const yearSelect = container.querySelector(`#${instanceId}-year-select`) as HTMLSelectElement;
    const dateSummary = container.querySelector('.date-summary') as HTMLDivElement;
    const ageDisplay = container.querySelector('.age-display') as HTMLDivElement;
    const errorText = container.querySelector('.error-text') as HTMLDivElement;
    const cancelButton = container.querySelector('.btn-cancel') as HTMLButtonElement;
    const confirmButton = container.querySelector('.btn-confirm') as HTMLButtonElement;
    const processingOverlay = container.querySelector('.processing-overlay') as HTMLDivElement;
    const successState = container.querySelector('.success-state') as HTMLDivElement;
    const successDetails = container.querySelector('.success-details') as HTMLDivElement;
    const datepickerBody = container.querySelector('.datepicker-body') as HTMLDivElement; // For keyboard listener

    // --- Event Handlers ---
    const handleMonthChange = (e: Event) => {
      if (isCompleted || isProcessing) return;
      selectedMonth = parseInt((e.target as HTMLSelectElement).value, 10);
      selectedDay = null; // Reset day when month changes
      daySelect.value = ""; // Reset day dropdown visual
      updateDayOptions();
      updateDateSummary();
    };

    const handleDayChange = (e: Event) => {
      if (isCompleted || isProcessing) return;
      selectedDay = parseInt((e.target as HTMLSelectElement).value, 10);
      updateDateSummary();
    };

    const handleYearChange = (e: Event) => {
      if (isCompleted || isProcessing) return;
      selectedYear = parseInt((e.target as HTMLSelectElement).value, 10);
      selectedDay = null; // Reset day when year changes
      daySelect.value = ""; // Reset day dropdown visual
      updateDayOptions();
      updateDateSummary();
    };

    const handleCancelClick = () => {
      if (isCompleted || isProcessing) return;

      isProcessing = true;
      disableAllControls();
      processingOverlay.classList.add('active');

      setTimeout(() => {
        // Check if still processing in case confirm was clicked rapidly after
        if (isProcessing && !isCompleted) {
            window.voiceflow.chat.interact({
                type: "cancel", // Use 'cancel' type if appropriate for Voiceflow flow
                payload: {
                    cancelled: true,
                    timestamp: Date.now()
                }
            });
        }
        // Note: The component might be removed by Voiceflow after this interaction.
        // Cleanup logic will handle listener removal if the component persists unexpectedly.
      }, 300); // Short delay for visual feedback
    };

    const handleConfirmClick = () => {
      if (isCompleted || isProcessing) return;

      if (selectedYear === null || selectedMonth === null || selectedDay === null) {
        errorText.style.display = 'block';
        return;
      }

      isProcessing = true;
      disableAllControls();
      processingOverlay.classList.add('active');

      const month = selectedMonth + 1; // Format as 1-based month
      const formattedDate = formatDate(selectedYear, month, selectedDay);
      const age = calculateAge(selectedDate!);

      setTimeout(() => {
        isCompleted = true;
        showSuccessState(formattedDate, age);

        setTimeout(() => {
          window.voiceflow.chat.interact({
            type: "complete",
            payload: {
              date: formattedDate,
              age: age,
              year: selectedYear!,
              month: month,
              day: selectedDay!,
              timestamp: Date.now()
            }
          });
           // Note: Component might be removed after this. Cleanup handles listeners.
        }, 1000); // Delay after success animation
      }, 800); // Delay before showing success
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (isCompleted || isProcessing) return;

        if (e.key === 'Enter' && !confirmButton.disabled) {
            e.preventDefault();
            handleConfirmClick();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelClick();
        }
    };

    // --- Update Functions ---
    const updateDayOptions = () => {
      if (selectedMonth === null || selectedYear === null) {
        daySelect.disabled = true;
        daySelect.innerHTML = '<option value="" disabled selected>Select day</option>'; // Reset options
        return;
      }

      daySelect.disabled = false;
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      let currentDayValue = selectedDay; // Store currently selected day before resetting

      // Clear existing options except the placeholder
      daySelect.innerHTML = '<option value="" disabled selected>Select day</option>';

      // Add day options
      let validDaySelected = false;
      for (let day = 1; day <= daysInMonth; day++) {
        const option = document.createElement('option');
        option.value = String(day);
        option.textContent = String(day);

        // Disable future dates if configured
        if (isFutureDate(selectedYear, selectedMonth, day)) {
          option.disabled = true;
        }

        daySelect.appendChild(option);

        // Check if the previously selected day is still valid
        if (!option.disabled && currentDayValue === day) {
            validDaySelected = true;
        }
      }

      // Restore selection if the previously selected day is still valid, otherwise reset
       if (validDaySelected && currentDayValue !== null) {
            daySelect.value = String(currentDayValue);
            selectedDay = currentDayValue; // Ensure state matches restored value
       } else {
            selectedDay = null; // Reset state if previous day became invalid
            daySelect.value = ""; // Ensure dropdown shows placeholder visually
       }
    };

    const updateDateSummary = () => {
      if (selectedYear !== null && selectedMonth !== null && selectedDay !== null) {
        const formattedDate = formatDate(selectedYear, selectedMonth + 1, selectedDay);
        dateSummary.textContent = formattedDate;
        dateSummary.classList.add('has-date');
        dateSummary.classList.add('highlight-animation');
        setTimeout(() => dateSummary.classList.remove('highlight-animation'), 500);

        selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
        const age = calculateAge(selectedDate);

        ageDisplay.textContent = `${config.ageLabel}: ${age} years`;
        ageDisplay.style.display = 'block';
        confirmButton.disabled = false;
        errorText.style.display = 'none';
      } else {
        dateSummary.textContent = 'No date selected';
        dateSummary.classList.remove('has-date');
        ageDisplay.style.display = 'none';
        confirmButton.disabled = true;
        selectedDate = null; // Clear the date object
      }
    };

    const disableAllControls = () => {
      monthSelect.disabled = true;
      daySelect.disabled = true;
      yearSelect.disabled = true;
      confirmButton.disabled = true;
      cancelButton.disabled = true; // Also disable cancel during processing/completion
    };

    const showSuccessState = (date: string, age: number) => {
      successDetails.textContent = `${date} (Age: ${age})`;
      successState.style.display = 'block';
      processingOverlay.classList.remove('active');
      // Controls are already disabled by disableAllControls()
    };

    // --- Add Event Listeners ---
    monthSelect.addEventListener('change', handleMonthChange);
    daySelect.addEventListener('change', handleDayChange);
    yearSelect.addEventListener('change', handleYearChange);
    cancelButton.addEventListener('click', handleCancelClick);
    confirmButton.addEventListener('click', handleConfirmClick);
    datepickerBody.addEventListener('keydown', handleKeyDown); // Add to body for better capture

    // --- Cleanup Function ---
    // This function will be called by Voiceflow when the component is removed
    return () => {
      console.log(`CalendarDatePicker (${instanceId}): Cleaning up listeners.`);
      monthSelect.removeEventListener('change', handleMonthChange);
      daySelect.removeEventListener('change', handleDayChange);
      yearSelect.removeEventListener('change', handleYearChange);
      cancelButton.removeEventListener('click', handleCancelClick);
      confirmButton.removeEventListener('click', handleConfirmClick);
      datepickerBody.removeEventListener('keydown', handleKeyDown);
      // No need to manually remove the 'element' itself, Voiceflow handles that.
    };
  }
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
      maxSelections: parseInt(trace.payload?.maxSelections, 10) || trace.payload?.options?.length || 0, // Parse maxSelections
      color: trace.payload?.color || "#545857",
      title: trace.payload?.title || "Select your options",
      submitText: trace.payload?.submitText || "Submit",
      cancelText: trace.payload?.cancelText || "Cancel",
      darkMode: trace.payload?.darkMode || false,
      successMessage: trace.payload?.successMessage || "Your selection has been saved",
      slantTitle: trace.payload?.slantTitle || false,
      titleSkewDegree: parseInt(trace.payload?.titleSkewDegree, 10) || -10 // Parse skew degree
    };

     // Ensure maxSelections is valid
     if (isNaN(config.maxSelections) || config.maxSelections <= 0) {
        config.maxSelections = config.options.length || 1; // Default to all or 1 if no options
     }

    // Create unique ID
    const instanceId = `multiselect-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Color utilities
    const hexToRgba = (hex: string, alpha = 1): string => {
        if (hex.length === 4) {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }
         if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            console.warn(`Invalid hex color: ${hex}. Using default.`);
            hex = '#545857'; // Default fallback
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Function to adjust color brightness (simple version)
    function adjustBrightness(hex: string, percent: number): string {
      if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) return hex; // Return original if invalid

      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);

      // Calculate brightness adjustment factor (1 + percent/100)
      const factor = 1 + percent / 100;

      // Adjust and clamp values between 0 and 255
      r = Math.max(0, Math.min(255, Math.round(r * factor)));
      g = Math.max(0, Math.min(255, Math.round(g * factor)));
      b = Math.max(0, Math.min(255, Math.round(b * factor)));

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Set color scheme based on dark mode preference
    const colors = {
      primary: config.color,
      primaryHover: adjustBrightness(config.color, config.darkMode ? 20 : -15), // Adjust brightness percentage as needed
      background: config.darkMode ? '#1E293B' : '#FFFFFF',
      surface: config.darkMode ? '#334155' : '#FFFFFF',
      text: config.darkMode ? '#F1F5F9' : '#303235',
      textSecondary: config.darkMode ? '#94A3B8' : '#72727a',
      border: config.darkMode ? '#475569' : 'rgba(0, 0, 0, 0.08)',
      hoverBg: config.darkMode ? '#475569' : 'rgba(0, 0, 0, 0.04)',
      error: '#FF4444', // Use a standard error color
      errorBg: hexToRgba('#FF4444', 0.1),
      successIconBg: config.color, // Use primary color for success icon bg
      successBg: hexToRgba(config.color, 0.1),
      successBorder: hexToRgba(config.color, 0.2),
    };

    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.id = instanceId;
    multiSelectContainer.className = "_1ddzqsn7"; // Assuming this class is for block display
    multiSelectContainer.setAttribute('aria-labelledby', `${instanceId}-title`); // For accessibility

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        /* Scope styles to the instance ID */
        #${instanceId} .multi-select-container {
          font-family: 'Inter', sans-serif;
          width: 100%;
          max-width: 450px;
          margin: 0 auto;
          padding: 0; /* Reset padding */
        }

        #${instanceId} .multi-select-title {
          font-size: 15px;
          color: ${colors.textSecondary};
          margin-bottom: 14px;
          font-weight: 500;
          ${config.slantTitle ? `
            font-style: italic;
            transform: skewX(${config.titleSkewDegree}deg);
            display: inline-block; /* Needed for transform */
            background: ${hexToRgba(config.color, 0.08)};
            padding: 6px 12px;
            border-radius: 4px;
            color: ${config.color};
            margin-left: ${config.titleSkewDegree < 0 ? Math.abs(config.titleSkewDegree / 2) : -Math.abs(config.titleSkewDegree / 2)}px; /* Adjust margin based on skew */
          ` : ''}
        }

        #${instanceId} .multi-select-subtitle {
          font-size: 13px;
          color: ${colors.textSecondary};
          margin-bottom: 16px;
          opacity: 0.8;
        }

        #${instanceId} .multi-select-options {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
          list-style: none; /* Use list for semantics */
          padding: 0;
        }

        #${instanceId} .option-item { /* Use list items */
           opacity: 0;
           animation: slideIn-${instanceId} 0.3s forwards;
        }

        #${instanceId} .option-label {
          display: flex;
          align-items: center;
          padding: 12px;
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        #${instanceId} .option-label:hover {
          border-color: ${colors.primary};
          /* transform: translateX(2px); */ /* Subtle hover effect */
          background: ${colors.hoverBg};
        }

        #${instanceId} .checkbox-wrapper {
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

        #${instanceId} .option-label:hover .checkbox-wrapper {
          border-color: ${colors.primary};
        }

        #${instanceId} .checkbox-input { /* Visually hide but keep accessible */
           border: 0;
           clip: rect(0 0 0 0);
           height: 1px;
           margin: -1px;
           overflow: hidden;
           padding: 0;
           position: absolute;
           width: 1px;
           white-space: nowrap;
        }

        #${instanceId} .checkbox-input:focus + .checkbox-wrapper { /* Focus style */
            border-color: ${colors.primary};
            box-shadow: 0 0 0 2px ${hexToRgba(colors.primary, 0.3)};
        }

        #${instanceId} .checkbox-input:checked + .checkbox-wrapper {
          background: ${colors.primary};
          border-color: ${colors.primary};
        }

        #${instanceId} .checkbox-input:checked + .checkbox-wrapper::after {
          content: '';
          width: 6px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-1px, -1px);
          display: block;
        }

        #${instanceId} .option-text {
          font-size: 14px;
          color: ${colors.text};
          line-height: 1.4;
        }

        #${instanceId} .error-message {
          color: ${colors.error};
          font-size: 13px;
          margin: -8px 0 12px;
          display: none; /* Initially hidden */
          animation: slideIn-${instanceId} 0.3s ease;
          padding: 10px;
          background: ${colors.errorBg};
          border-radius: 6px;
          text-align: center;
          border: 1px solid ${hexToRgba(colors.error, 0.2)};
          role: alert; /* Accessibility */
        }

        #${instanceId} .button-group {
          display: grid;
          grid-template-columns: 1fr; /* Default to single column */
          gap: 8px;
        }
         /* Optional: side-by-side buttons if space allows */
         @media (min-width: 350px) {
           #${instanceId} .button-group {
              grid-template-columns: 1fr 1fr;
           }
           #${instanceId} .cancel-button {
              grid-column: 1; /* Place cancel first visually */
           }
            #${instanceId} .submit-button {
              grid-column: 2; /* Place submit second */
           }
         }


        #${instanceId} .submit-button,
        #${instanceId} .cancel-button {
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

        #${instanceId} .submit-button {
          background: ${colors.primary};
          color: white;
          box-shadow: 0 2px 5px ${hexToRgba(colors.primary, 0.3)};
          order: 2; /* Submit comes after cancel in default flow */
        }
        @media (min-width: 350px) {
            #${instanceId} .submit-button { order: 0; } /* Reset order */
        }


        #${instanceId} .submit-button:not(:disabled):hover {
          background: ${colors.primaryHover};
          transform: translateY(-1px);
          box-shadow: 0 4px 8px ${hexToRgba(colors.primary, 0.4)};
        }

        #${instanceId} .submit-button:not(:disabled):active {
          transform: translateY(0);
        }

        #${instanceId} .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        #${instanceId} .cancel-button {
          background: transparent;
          color: ${colors.textSecondary};
          border: 1px solid ${hexToRgba(colors.textSecondary, 0.2)};
           order: 1; /* Cancel comes first in default flow */
        }
         @media (min-width: 350px) {
            #${instanceId} .cancel-button { order: 0; } /* Reset order */
        }


        #${instanceId} .cancel-button:not(:disabled):hover {
          background: ${hexToRgba(colors.textSecondary, 0.1)};
        }

        #${instanceId} .cancel-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        @keyframes slideIn-${instanceId} {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shake-${instanceId} {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        #${instanceId} .shake {
          animation: shake-${instanceId} 0.3s ease;
        }

        /* Success state styling */
        #${instanceId} .success-message {
          text-align: center;
          padding: 16px;
          margin-top: 16px;
          background: ${colors.successBg};
          border-radius: 8px;
          font-size: 14px;
          color: ${colors.text};
          border: 1px solid ${colors.successBorder};
          display: none; /* Initially hidden */
          animation: fadeIn-${instanceId} 0.5s ease;
          role: status; /* Accessibility */
        }

        #${instanceId} .success-icon {
          display: block;
          width: 36px;
          height: 36px;
          margin: 0 auto 12px;
          background: ${colors.successIconBg}; /* Use configured color */
          border-radius: 50%;
          position: relative;
          animation: scaleIn-${instanceId} 0.4s cubic-bezier(0.18, 1.25, 0.6, 1.25) forwards;
          opacity: 0;
          transform: scale(0.5);
        }

        #${instanceId} .success-icon::after { /* Checkmark */
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

        #${instanceId} .success-text {
          display: block;
          animation: fadeIn-${instanceId} 0.5s ease forwards 0.2s;
          opacity: 0;
        }

        @keyframes fadeIn-${instanceId} {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn-${instanceId} {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      </style>

      <div class="multi-select-container">
        <div class="multi-select-title" id="${instanceId}-title">${config.title}</div>
        ${config.maxSelections < config.options.length && config.maxSelections > 0 ?
          `<div class="multi-select-subtitle">Choose up to ${config.maxSelections} options</div>` :
          (config.maxSelections === 1 ? `<div class="multi-select-subtitle">Choose one option</div>` : '')}
        <ul class="multi-select-options" role="group" aria-labelledby="${instanceId}-title">
          ${config.options.map((option, index) => `
            <li class="option-item" style="animation-delay: ${index * 0.05}s">
              <label class="option-label">
                <input type="checkbox" class="checkbox-input" name="options" value="${option}">
                <span class="checkbox-wrapper" aria-hidden="true"></span>
                <span class="option-text">${option}</span>
              </label>
            </li>
          `).join('')}
        </ul>
        <div class="error-message"></div>
        <div class="button-group">
          <button type="button" class="cancel-button">${config.cancelText}</button>
          <button type="submit" class="submit-button" disabled>${config.submitText}</button>
        </div>
        <div class="success-message">
          <div class="success-icon"></div>
          <span class="success-text">${config.successMessage}</span>
        </div>
      </div>
    `;

    let isSubmitted = false;
    const optionsList = multiSelectContainer.querySelector(".multi-select-options") as HTMLUListElement;
    const errorMessage = multiSelectContainer.querySelector(".error-message") as HTMLDivElement;
    const submitButton = multiSelectContainer.querySelector(".submit-button") as HTMLButtonElement;
    const cancelButton = multiSelectContainer.querySelector(".cancel-button") as HTMLButtonElement;
    const checkboxes = multiSelectContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const successMessageDiv = multiSelectContainer.querySelector(".success-message") as HTMLDivElement;


    const updateSubmitButton = () => {
      if (isSubmitted) return;
      const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
      submitButton.disabled = selectedCount === 0;
    };

    const showError = (message: string) => {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
      // Add shake animation to the list container
      optionsList.classList.add('shake');
      // Remove the class after the animation completes
      setTimeout(() => {
        optionsList.classList.remove('shake');
      }, 300);
    };

    const hideError = () => {
         errorMessage.style.display = "none";
         errorMessage.textContent = ""; // Clear text
    }

    const disableForm = () => {
      isSubmitted = true; // Ensure state is set
      checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
        const label = checkbox.closest('.option-label');
        if (label) {
            label.style.opacity = "0.7";
            label.style.cursor = "not-allowed";
            label.style.pointerEvents = "none"; // Prevent hover effects etc.
        }
      });

      submitButton.disabled = true;
      cancelButton.disabled = true;
    };

    const showSuccess = () => {
      successMessageDiv.style.display = "block";
    };

    // --- Event Handlers ---
    const handleCheckboxChange = (event: Event) => {
      if (isSubmitted) return;

      const checkbox = event.target as HTMLInputElement;
      const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;

      if (config.maxSelections > 0 && selectedCount > config.maxSelections) {
        checkbox.checked = false; // Prevent checking more than max
        showError(`You can select up to ${config.maxSelections} options`);
      } else {
        hideError(); // Hide error if selection is valid
      }

      updateSubmitButton();
    };

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      if (isSubmitted) return;

      const selectedOptions = Array.from(checkboxes)
        .filter(input => input.checked)
        .map(input => input.value);

      // Final check (although button should be disabled if none selected)
      if (selectedOptions.length === 0) {
           showError("Please select at least one option.");
           return;
      }

      disableForm();
      showSuccess();

      // Short delay before sending the interaction
      setTimeout(() => {
        window.voiceflow.chat.interact({
          type: "complete",
          payload: { options: selectedOptions }
        });
         // Component might be removed by VF after interaction
      }, 1200);
    };

    const handleCancel = () => {
      if (isSubmitted) return;

      disableForm();

       // Optionally show a cancelled state or just interact
       cancelButton.textContent = "Cancelled"; // Basic visual feedback

       setTimeout(() => {
            window.voiceflow.chat.interact({
                type: "cancel", // Use 'cancel' type if appropriate for flow
                payload: { cancelled: true, options: [] }
            });
            // Component might be removed by VF after interaction
        }, 300);
    };


    // --- Attach Event Listeners ---
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", handleCheckboxChange);
    });

    multiSelectContainer.addEventListener("submit", handleSubmit);
    cancelButton.addEventListener("click", handleCancel);


    // Append to the element provided by Voiceflow
    element.innerHTML = ''; // Clear previous content if any
    element.appendChild(multiSelectContainer);

    // --- Cleanup Function ---
    return () => {
        console.log(`MultiSelectExtension (${instanceId}): Cleaning up listeners.`);
        checkboxes.forEach(checkbox => {
            checkbox.removeEventListener("change", handleCheckboxChange);
        });
        multiSelectContainer.removeEventListener("submit", handleSubmit);
        cancelButton.removeEventListener("click", handleCancel);
    };
  },
};


/**
 * WARNING: This extension directly manipulates the Voiceflow Web Chat's
 * internal Shadow DOM structure. Class names (e.g., '.vfrc-input-container',
 * '.vfrc-chat-input--button', '.c-bXTvXv') and the overall structure are
 * internal implementation details of the chat widget and ARE SUBJECT TO CHANGE
 * WITHOUT NOTICE in future Voiceflow updates. Use of this extension carries
 * a significant risk of breaking if the chat widget's internal code changes.
 * Test thoroughly after any Voiceflow chat widget update.
 */
export const DisableInputsExtension = {
  name: "DisableInputs",
  type: "effect",
  match: ({ trace }) =>
    trace.type === "ext_disableInputs" ||
    trace.payload?.name === "ext_disableInputs",
  effect: async ({ trace }) => {
    try {
      // Configuration option
      const hideCompletely = trace.payload?.hideCompletely || false;

      // WARNING: Accessing shadowRoot directly is fragile.
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) {
        console.warn("DisableInputs Extension: Could not find voiceflow-chat shadowRoot.");
        window.voiceflow.chat.interact({ type: "complete" });
        return;
      }

      const shadowRoot = chatDiv.shadowRoot;

      // WARNING: Relies on Voiceflow's internal class name.
      const inputContainer = shadowRoot.querySelector(".vfrc-input-container") as HTMLElement | null;

      if (inputContainer) {
        if (hideCompletely) {
          inputContainer.style.display = "none";
        } else {
          inputContainer.style.opacity = "0.5";
          inputContainer.style.pointerEvents = "none";
          inputContainer.style.transition = "opacity 0.3s ease"; // Corrected property name
        }
      } else {
         console.warn("DisableInputs Extension: Could not find input container '.vfrc-input-container'.");
      }

      // WARNING: These selectors target internal Voiceflow elements and may break.
      const elementsToDisable = shadowRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>(
          // Combine selectors carefully
          'textarea, input, button, .vfrc-chat-input--button, .vfrc-send-button' // Added common button classes, adjust as needed
      );

      elementsToDisable.forEach(el => {
        // Only disable elements within the input container if not hiding completely
        if (!hideCompletely && inputContainer && inputContainer.contains(el)) {
            el.disabled = true;
            el.style.pointerEvents = "none";
            el.style.opacity = "0.5"; // Apply visual cue
            el.style.transition = "opacity 0.3s ease";

            if (el.tagName.toLowerCase() === "textarea") {
                // Optional: change background for disabled textarea
                el.style.backgroundColor = config.darkMode ? "#475569" : "#f0f0f0";
            }
        } else if (hideCompletely && inputContainer && inputContainer.contains(el)) {
             // If hiding, just ensure they are disabled logically
             el.disabled = true;
        } else if (!inputContainer && !hideCompletely) {
             // Fallback if container not found but not hiding: disable globally (riskier)
             el.disabled = true;
             el.style.pointerEvents = "none";
             el.style.opacity = "0.5";
             el.style.transition = "opacity 0.3s ease";
        } else if (!inputContainer && hideCompletely) {
             // Fallback if container not found and hiding: disable globally
             el.disabled = true;
        }
      });

      // Handle voice input overlay specifically if needed
      // WARNING: Relies on Voiceflow's internal class name.
      const voiceOverlay = shadowRoot.querySelector(".vfrc-voice-input") as HTMLElement | null;
      if (voiceOverlay) {
        voiceOverlay.style.display = "none"; // Hide voice input regardless of hideCompletely setting? Decide based on desired UX.
      }

      window.voiceflow.chat.interact({ type: "complete" });

    } catch (error) {
      console.error('DisableInputs Extension Error:', error);
      // Attempt to complete even on error
      window.voiceflow.chat.interact({ type: "complete", payload: { error: true, message: (error as Error).message } });
    }
  }
};


/**
 * WARNING: This extension directly manipulates the Voiceflow Web Chat's
 * internal Shadow DOM structure. Class names (e.g., '.vfrc-input-container',
 * '.vfrc-chat-input--button', '.c-bXTvXv') and the overall structure are
 * internal implementation details of the chat widget and ARE SUBJECT TO CHANGE
 * WITHOUT NOTICE in future Voiceflow updates. Use of this extension carries
 * a significant risk of breaking if the chat widget's internal code changes.
 * Test thoroughly after any Voiceflow chat widget update.
 */
export const EnableInputsExtension = {
  name: "EnableInputs",
  type: "effect",
  match: ({ trace }) =>
    trace.type === "ext_enableInputs" ||
    trace.payload?.name === "ext_enableInputs",
  effect: async ({ trace }) => {
    try {
      // WARNING: Accessing shadowRoot directly is fragile.
      const chatDiv = document.getElementById("voiceflow-chat");
      if (!chatDiv?.shadowRoot) {
         console.warn("EnableInputs Extension: Could not find voiceflow-chat shadowRoot.");
        window.voiceflow.chat.interact({ type: "complete" });
        return;
      }
      const shadowRoot = chatDiv.shadowRoot;

      // WARNING: Relies on Voiceflow's internal class name.
      const inputContainer = shadowRoot.querySelector(".vfrc-input-container") as HTMLElement | null;
      if (inputContainer) {
        inputContainer.style.display = ""; // Remove display:none if it was set
        inputContainer.style.opacity = "1";
        inputContainer.style.pointerEvents = "auto";
        inputContainer.style.transition = "opacity 0.3s ease"; // Corrected property name
      } else {
         console.warn("EnableInputs Extension: Could not find input container '.vfrc-input-container'. Re-enabling elements globally.");
      }

       // WARNING: These selectors target internal Voiceflow elements and may break.
      const elementsToEnable = shadowRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>(
          // Use the same selectors as DisableInputs for consistency
          'textarea, input, button, .vfrc-chat-input--button, .vfrc-send-button'
      );

      elementsToEnable.forEach(el => {
         // Enable elements regardless of whether the container was found,
         // as they might have been disabled by a previous step even if the container wasn't found then.
        el.disabled = false;
        el.style.pointerEvents = "auto";
        el.style.opacity = "1";
        el.style.transition = "opacity 0.3s ease";

        if (el.tagName.toLowerCase() === "textarea") {
          el.style.backgroundColor = ""; // Reset background
        }
      });

       // Re-enable voice input overlay if it exists and was hidden
       // WARNING: Relies on Voiceflow's internal class name.
       const voiceOverlay = shadowRoot.querySelector(".vfrc-voice-input") as HTMLElement | null;
       if (voiceOverlay) {
         voiceOverlay.style.display = ""; // Reset display style
       }

      window.voiceflow.chat.interact({ type: "complete" });

    } catch (error) {
      console.error('EnableInputs Extension Error:', error);
       // Attempt to complete even on error
      window.voiceflow.chat.interact({ type: "complete", payload: { error: true, message: (error as Error).message } });
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
      duration: parseInt(trace.payload?.duration, 10) || 2000,
      completionDelay: parseInt(trace.payload?.completionDelay, 10) || 800,
      text: trace.payload?.text || "Processing",
      completeText: trace.payload?.completeText || "Complete",
      primaryColor: trace.payload?.color || "#34D399", // Emerald green default
      theme: trace.payload?.theme || "liquid", // 'liquid', 'pulse', 'blocks', 'glow', 'minimal'
      style: trace.payload?.style || "standard", // 'standard', 'slim', 'bold'
      showPercentage: trace.payload?.showPercentage !== false, // Default true
      interactive: trace.payload?.interactive || false, // Allow user completion?
      sound: trace.payload?.sound || false, // Play sounds?
      vibration: trace.payload?.vibration || false, // Use vibration API?
      darkMode: trace.payload?.darkMode || false,
      fullWidth: trace.payload?.fullWidth !== false // Default true
    };

    // Ensure completionDelay isn't longer than duration
    if (config.completionDelay >= config.duration) {
      console.warn("TransitionAnimation: completionDelay is >= duration. Setting delay to 0.");
      config.completionDelay = 0;
    }
    // Calculate actual animation duration before completion state kicks in
    const actualDuration = Math.max(0, config.duration - config.completionDelay);
    const instanceId = `transition-anim-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Color utilities
    const hexToRgba = (hex: string, alpha = 1): string => {
        if (hex.length === 4) {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }
         if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            console.warn(`Invalid hex color: ${hex}. Using default.`);
            hex = '#34D399'; // Default fallback
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const darkenColor = (hex: string, amount = 20): string => {
        if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) return hex;
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.max(0, r - amount);
        g = Math.max(0, g - amount);
        b = Math.max(0, b - amount);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Setup colors and theme-specific elements
    const baseColor = config.primaryColor;
    const secondaryColor = darkenColor(baseColor, 30); // Darken a bit more for contrast
    const bgColor = config.darkMode ? hexToRgba('#374151', 0.6) : hexToRgba(baseColor, 0.1); // Use slightly darker gray for dark mode bg
    const textColor = config.darkMode ? '#FFFFFF' : '#1F2937'; // Darker text for light mode
    const contentColor = config.theme === 'minimal' ? textColor : '#FFFFFF'; // Text color inside the bar


    // Theme configurations (simplified elements for clarity)
    const themes = {
      liquid: {
        container: 'liquid-container',
        fill: 'liquid-fill',
        content: 'liquid-content',
        elements: `<div class="wave-${instanceId}"></div><div class="wave-${instanceId}" style="animation-delay: -2s;"></div>`,
        styles: `
          #${instanceId} .liquid-fill { background: linear-gradient(90deg, ${baseColor}, ${secondaryColor}); animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards; overflow: hidden; position: relative; }
          #${instanceId} .wave-${instanceId} { position: absolute; bottom: 0; left: 50%; width: 200%; height: 15px; background: ${hexToRgba('#ffffff', 0.2)}; border-radius: 50% 50% 0 0 / 10px 10px 0 0; animation: waveAnim-${instanceId} 4s linear infinite; transform: translateX(-50%); opacity: 0.8; }
          @keyframes waveAnim-${instanceId} { 0% { transform: translateX(-50%) rotate(0deg); } 100% { transform: translateX(-50%) rotate(360deg); } }
        `
      },
      pulse: {
        container: 'pulse-container',
        fill: 'pulse-fill',
        content: 'pulse-content',
        elements: `<div class="pulse-ring-${instanceId}"></div><div class="pulse-ring-${instanceId}" style="animation-delay: 0.8s;"></div>`,
        styles: `
          #${instanceId} .pulse-fill { background: linear-gradient(90deg, ${baseColor}, ${secondaryColor}); animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards; position: relative; overflow: hidden; }
          #${instanceId} .pulse-ring-${instanceId} { position: absolute; top: 50%; left: 20%; width: 10px; height: 10px; background: ${hexToRgba('#ffffff', 0.3)}; border-radius: 50%; transform: translate(-50%, -50%); animation: pulseRingAnim-${instanceId} 2.5s ease-out infinite; }
          @keyframes pulseRingAnim-${instanceId} { 0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(6); opacity: 0; } }
        `
      },
       blocks: {
        container: 'blocks-container',
        fill: 'blocks-fill',
        content: 'blocks-content',
        elements: `<div class="blocks-grid-${instanceId}">${Array.from({length: 10}, (_, i) => `<div class="block-${instanceId}" style="animation-delay: ${Math.random() * 1}s;"></div>`).join('')}</div>`,
        styles: `
          #${instanceId} .blocks-fill { background: linear-gradient(90deg, ${baseColor}, ${secondaryColor}); animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards; position: relative; overflow: hidden;}
          #${instanceId} .blocks-grid-${instanceId} { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; gap: 2px; padding: 3px; box-sizing: border-box; }
          #${instanceId} .block-${instanceId} { flex-grow: 1; background: ${hexToRgba('#ffffff', 0.2)}; border-radius: 2px; animation: blockPulseAnim-${instanceId} 1.5s ease-in-out infinite; }
          @keyframes blockPulseAnim-${instanceId} { 0%, 100% { opacity: 0.4; transform: scaleY(0.6); } 50% { opacity: 1; transform: scaleY(1); } }
        `
      },
       glow: {
        container: 'glow-container',
        fill: 'glow-fill',
        content: 'glow-content',
        elements: `<div class="glow-effect-${instanceId}"></div>`,
        styles: `
          #${instanceId} .glow-container { overflow: visible; /* Allow shadow */ }
          #${instanceId} .glow-fill { background: linear-gradient(90deg, ${baseColor}, ${secondaryColor}); animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards; box-shadow: 0 0 12px ${hexToRgba(baseColor, 0.5)}; position: relative; }
          #${instanceId} .glow-effect-${instanceId} { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, ${hexToRgba('#ffffff', 0.15)} 0%, transparent 70%); animation: glowPulseAnim-${instanceId} 2s ease-in-out infinite; }
           @keyframes glowPulseAnim-${instanceId} { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        `
      },
      minimal: {
        container: 'minimal-container',
        fill: 'minimal-fill',
        content: 'minimal-content',
        elements: ``,
        styles: `
          #${instanceId} .minimal-container { height: 8px; background: ${config.darkMode ? hexToRgba('#ffffff', 0.1) : hexToRgba('#000000', 0.05)}; border-radius: 4px; /* Rounded for minimal */ }
          #${instanceId} .minimal-fill { background: ${baseColor}; animation: fillProgress-${instanceId} ${actualDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards; border-radius: 4px; height: 100%; }
          #${instanceId} .minimal-content { position: absolute; right: ${config.fullWidth ? '10px' : '0'}; top: -24px; font-size: 12px; color: ${textColor}; }
        `
      }
    };

    // Select theme
    const theme = themes[config.theme as keyof typeof themes] || themes.liquid;

    // Sound effect function (basic)
    const playSound = (type: 'start' | 'complete' | 'click') => {
      if (!config.sound || typeof window.AudioContext === 'undefined') return;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type === 'complete' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(type === 'complete' ? 880 : (type === 'click' ? 1000 : 660), ctx.currentTime); // Higher pitch for complete/click
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime); // Slightly louder

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        // Fade out quickly
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (type === 'complete' ? 0.2 : 0.1));
        oscillator.stop(ctx.currentTime + (type === 'complete' ? 0.2 : 0.1));

        // Close context after sound stops to free resources
        setTimeout(() => ctx.close(), type === 'complete' ? 300 : 200);
      } catch (e) {
        console.warn('TransitionAnimation: Web Audio API error -', (e as Error).message);
      }
    };

    // Vibration function
    const vibrate = (pattern: number | number[]) => {
      if (config.vibration && 'vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch (e) {
           console.warn('TransitionAnimation: Vibration API not supported or failed.');
        }
      }
    };

    // Create animation container
    const animationContainer = document.createElement("div");
    animationContainer.id = instanceId;
    animationContainer.className = "_1ddzqsn7"; // Base class for display block

    // Create style tag with all needed styles
    const styleContent = `
      /* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'); */ /* Assume font loaded elsewhere */

      /* Base styles scoped to instance ID */
      #${instanceId} {
        display: block !important; /* Ensure it takes block space */
        width: 100% !important;
        margin: 0;
        padding: 0;
        font-family: 'Inter', system-ui, sans-serif;
        position: relative;
        z-index: 1; /* Ensure it's above static content */
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      #${instanceId} .processing-container {
        position: relative;
        height: ${config.style === 'slim' ? '24px' : config.style === 'bold' ? '48px' : '36px'};
        width: 100%;
        border-radius: ${config.fullWidth ? '0' : '8px'};
        margin: ${config.fullWidth ? '0' : '12px 0'}; /* Margin only if not full width */
        padding: 0;
        background: ${bgColor};
        overflow: hidden;
        box-shadow: ${config.fullWidth ? 'none' : `0 2px 8px ${hexToRgba('#000000', 0.08)}`};
        ${config.interactive ? 'cursor: pointer;' : ''}
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        outline: none; /* Remove default focus outline if interactive */
      }
       /* Add focus style for interactive mode */
      #${instanceId} .processing-container:focus-visible {
          box-shadow: 0 0 0 2px ${hexToRgba(baseColor, 0.4)};
       }


      ${config.interactive && !config.fullWidth ? `
        #${instanceId} .processing-container:not(.completed):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${hexToRgba('#000000', 0.12)};
        }
        #${instanceId} .processing-container:not(.completed):active {
          transform: translateY(0);
        }
      ` : ''}
       #${instanceId} .processing-container.completed {
           cursor: default;
       }

      #${instanceId} .processing-fill {
        position: absolute;
        top: 0;
        left: 0;
        width: 0%; /* Initial width */
        height: 100%;
        border-radius: inherit; /* Inherit radius from parent */
      }

      /* Define the fill animation */
      @keyframes fillProgress-${instanceId} {
        from { width: 0%; }
        to { width: 100%; }
      }

      #${instanceId} .processing-content {
        position: relative; /* Use relative for stacking context */
        z-index: 5; /* Above fill/effects */
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: ${contentColor}; /* Use calculated content color */
        font-size: ${config.style === 'slim' ? '12px' : config.style === 'bold' ? '16px' : '14px'};
        font-weight: ${config.style === 'bold' ? '600' : '500'};
        text-shadow: 0 1px 1px ${hexToRgba('#000000', 0.15)}; /* Subtle shadow */
        white-space: nowrap; /* Prevent text wrapping */
        overflow: hidden; /* Hide overflow */
        text-overflow: ellipsis; /* Add ellipsis if text too long */
        padding: 0 10px; /* Padding for text */
      }

      #${instanceId} .progress-percentage {
        margin-left: 8px;
        font-size: 0.9em;
        opacity: 0.8;
        font-weight: 400; /* Lighter weight for percentage */
      }

      /* Success state: change fill appearance */
      #${instanceId} .processing-container.success .processing-fill {
        /* Use a solid color or less prominent gradient for success */
        background: ${secondaryColor} !important;
        transition: background 0.3s ease;
        animation-play-state: paused !important; /* Stop fill animation */
        width: 100% !important; /* Ensure it's full width */
      }
       #${instanceId} .processing-container.success .processing-content {
          /* Optional: slightly change text color/style on success */
       }


      /* Completion effect overlay */
      #${instanceId} .completion-effect {
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        border-radius: inherit;
        pointer-events: none;
        z-index: 4; /* Below content, above fill */
        opacity: 0;
        background: radial-gradient(circle, ${hexToRgba(baseColor, 0.2)} 0%, transparent 70%);
      }

      #${instanceId} .completion-effect.active {
        animation: completionPulse-${instanceId} 0.6s ease-out;
      }

      @keyframes completionPulse-${instanceId} {
        0% { opacity: 0; transform: scale(0.9); }
        50% { opacity: 0.4; /* Less intense pulse */ }
        100% { opacity: 0; transform: scale(1.1); }
      }

      /* Checkmark styling */
      #${instanceId} .checkmark {
        display: inline-block;
        transform: rotate(45deg) scale(0); /* Initial state */
        height: ${config.style === 'bold' ? '10px' : '8px'}; /* Scale checkmark size */
        width: ${config.style === 'bold' ? '5px' : '4px'};
        border-bottom: 2px solid ${contentColor};
        border-right: 2px solid ${contentColor};
        opacity: 0;
        margin-left: 6px; /* Space from text */
        animation: checkmarkAnimation-${instanceId} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.1s; /* Delay start slightly */
        vertical-align: middle; /* Align with text */
      }

      @keyframes checkmarkAnimation-${instanceId} {
        0% { opacity: 0; transform: rotate(45deg) scale(0); }
        50% { opacity: 1; transform: rotate(45deg) scale(1.2); }
        100% { opacity: 1; transform: rotate(45deg) scale(1); }
      }

      /* Include theme-specific styles */
      ${theme.styles}

      /* Hide scroll indicators (consider if this is always desired) */
      /* This might hide legitimate UI elements in some contexts */
      /*
      [class*="scroll-down"],
      [class*="scroll-button"] {
        display: none !important;
      }
      */
    `;

    // Generate HTML
    animationContainer.innerHTML = `
      <style>${styleContent}</style>
      <div class="processing-container ${theme.container}"
           ${config.interactive ? 'tabindex="0" role="button" aria-live="polite" aria-label="Processing. Click or press Enter to complete."' : 'aria-live="polite" aria-label="Processing..."'}
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="processing-fill ${theme.fill}">
          ${theme.elements}
        </div>
        <div class="processing-content ${theme.content}">
          <span class="processing-text">${config.text}</span>
          ${config.showPercentage ? '<span class="progress-percentage">0%</span>' : ''}
          <!-- Checkmark will be appended here -->
        </div>
        <div class="completion-effect"></div>
      </div>
    `;

    // DOM references
    const container = animationContainer.querySelector('.processing-container') as HTMLElement;
    const processingText = animationContainer.querySelector('.processing-text') as HTMLSpanElement;
    const percentageElement = animationContainer.querySelector('.progress-percentage') as HTMLSpanElement | null; // May be null
    const completionEffect = animationContainer.querySelector('.completion-effect') as HTMLDivElement;
    const contentElement = animationContainer.querySelector('.processing-content') as HTMLDivElement;


    // State flags
    let isCompleted = false;
    let animationFrameId: number | null = null;
    let completionTimeoutId: NodeJS.Timeout | null = null; // Use NodeJS.Timeout type for clarity
    let startTime = performance.now(); // Use performance.now() for higher precision timing

    // Update percentage if enabled
    const updatePercentage = (timestamp: number) => {
      if (isCompleted || !percentageElement) {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
          return;
      }

      const elapsed = timestamp - startTime;
      // Ensure progress doesn't exceed 100 before completion logic runs
      const progress = Math.min(Math.floor((elapsed / actualDuration) * 100), 99);

      percentageElement.textContent = `${progress}%`;
      container.setAttribute('aria-valuenow', String(progress)); // Update accessibility attribute

      // Continue animation only if progress is less than 99 and not completed
      if (progress < 99 && !isCompleted) {
        animationFrameId = requestAnimationFrame(updatePercentage);
      } else if (progress >= 99 && animationFrameId){
          // Stop requesting frames if we hit 99% visually, let timeout handle 100%
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
      }
    };

    // Function to safely disable/enable Voiceflow inputs
    // WARNING: Relies on Voiceflow's internal DOM structure. May break.
    const toggleInputs = (disable: boolean) => {
      try {
        const chatDiv = document.getElementById("voiceflow-chat");
        if (!chatDiv?.shadowRoot) return;

        const inputContainer = chatDiv.shadowRoot.querySelector(".vfrc-input-container") as HTMLElement | null;
        if (inputContainer) {
          inputContainer.style.opacity = disable ? "0.5" : "1";
          inputContainer.style.pointerEvents = disable ? "none" : "auto";
          inputContainer.style.transition = "opacity 0.3s ease";

          const elements = inputContainer.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>(
              'textarea, input, button, .vfrc-chat-input--button, .vfrc-send-button'
          );
          elements.forEach(el => {
             el.disabled = disable;
          });
        }
      } catch (e) {
          console.error("TransitionAnimation: Error toggling inputs -", (e as Error).message);
      }
    };

    // Event handler function for click/keyboard
    const handleInteraction = (event?: Event) => {
      // Prevent accidental triggers or multiple completions
      if (isCompleted || !config.interactive) {
        if (event) event.preventDefault();
        return;
      }
      if (event) event.preventDefault(); // Prevent default button/link behavior

      console.log("TransitionAnimation: User triggered completion.");
      playSound('click');
      vibrate(30); // Short vibration for click
      completeAnimation(true); // Pass true for userTriggered
    };


    // Completion function
    const completeAnimation = (userTriggered = false) => {
       // Prevent multiple executions
      if (isCompleted) return;
      isCompleted = true;

      console.log("TransitionAnimation: Completing animation.");

      // Clear any pending timers/frames
      if (completionTimeoutId) clearTimeout(completionTimeoutId);
      completionTimeoutId = null;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;

      // Remove interactive listeners immediately
      if (config.interactive) {
          container.removeEventListener('click', handleInteraction);
          container.removeEventListener('keydown', handleKeyboardInteraction);
          container.removeAttribute('role'); // Remove interactive role
          container.removeAttribute('tabindex');
      }

      // Update UI to final state
      container.classList.add('success'); // Apply success styling
      container.setAttribute('aria-label', config.completeText); // Update accessibility label
      container.setAttribute('aria-valuenow', '100'); // Set final value

      if (percentageElement) {
        percentageElement.textContent = '100%';
      }
      processingText.textContent = config.completeText;

      // Add checkmark if not already present
      if (!contentElement.querySelector('.checkmark')) {
          const checkmark = document.createElement('span');
          checkmark.className = 'checkmark';
          contentElement.appendChild(checkmark); // Append inside content div
      }

      // Trigger completion visual effect
      completionEffect.classList.add('active');

      // Haptic feedback & Sound for completion
      vibrate(userTriggered ? [50] : [60, 40, 60]); // Different pattern for auto vs user
      playSound('complete');

      // Cleanup and send interaction after the visual delay
      setTimeout(() => {
        cleanup(); // Run final cleanup (though listeners are already removed)
        window.voiceflow.chat.interact({
          type: "complete",
          payload: {
            completed: true,
            duration: performance.now() - startTime, // Report actual elapsed time
            userTriggered: userTriggered,
            timestamp: Date.now()
          }
        });
         // VF might remove the element now
      }, config.completionDelay); // Use the configured delay for visual completion state
    };

     // Keyboard interaction handler
    const handleKeyboardInteraction = (e: KeyboardEvent) => {
        if (!isCompleted && config.interactive && (e.key === 'Enter' || e.key === ' ')) {
            handleInteraction(e);
        }
    };


    // Initial setup
    toggleInputs(true); // Disable VF inputs
    element.appendChild(animationContainer);
    playSound('start'); // Play sound on start
    vibrate(20); // Gentle vibration on start

    // Start percentage update if enabled
    if (config.showPercentage) {
      animationFrameId = requestAnimationFrame(updatePercentage);
    }

    // Add interactive listeners if configured
    if (config.interactive) {
      container.addEventListener('click', handleInteraction);
      container.addEventListener('keydown', handleKeyboardInteraction);
    }

    // Schedule automatic completion
    completionTimeoutId = setTimeout(() => {
      completeAnimation(false); // Auto-completed
    }, actualDuration); // Use calculated duration


    // --- Cleanup Function ---
    const cleanup = () => {
      console.log(`TransitionAnimation (${instanceId}): Cleaning up.`);
      // Ensure timers/frames are cleared
      if (completionTimeoutId) clearTimeout(completionTimeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      completionTimeoutId = null;
      animationFrameId = null;

       // Remove listeners (might be redundant if already removed in completeAnimation, but safe)
      if (config.interactive) {
           container.removeEventListener('click', handleInteraction);
           container.removeEventListener('keydown', handleKeyboardInteraction);
      }

      // Re-enable VF inputs
      toggleInputs(false);
    };

    // Return the cleanup function for Voiceflow to call
    return cleanup;
  }
};


export const RankOptionsExtension = {
  name: "RankOptions",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_rankoptions" || trace.payload?.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    // Ensure SortableJS is loaded. If not, attempt to load it.
    // This assumes SortableJS is available globally or via a module system.
    // If loading dynamically, consider error handling.
    if (typeof Sortable === 'undefined') {
        console.error("RankOptionsExtension Error: SortableJS library is not loaded.");
        element.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">Error: Ranking component requires SortableJS library.</div>`;
        return () => {}; // Return empty cleanup
    }


    // Configuration options with defaults
    const config = {
      options: trace.payload?.options || [],
      color: trace.payload?.color || "#545857", // Default gray
      title: trace.payload?.title || "Rank these items",
      submitText: trace.payload?.submitText || "Submit Ranking",
      submitMessage: trace.payload?.submitMessage || "Ranking submitted!",
      darkMode: trace.payload?.darkMode || false,
      slantTitle: trace.payload?.slantTitle || false,
      titleSkewDegree: parseInt(trace.payload?.titleSkewDegree, 10) || -10
    };

    // Unique ID for scoping styles and elements
    const instanceId = `rankoptions-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Color utilities
    const hexToRgba = (hex: string, alpha = 1): string => {
        if (hex.length === 4) {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }
         if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            console.warn(`Invalid hex color: ${hex}. Using default.`);
            hex = '#545857'; // Default fallback
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

     // Simple brightness adjustment
     function adjustBrightness(hex: string, percent: number): string {
        if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) return hex;
        let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        const factor = 1 + percent / 100;
        r = Math.max(0, Math.min(255, Math.round(r * factor)));
        g = Math.max(0, Math.min(255, Math.round(g * factor)));
        b = Math.max(0, Math.min(255, Math.round(b * factor)));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }


    // Determine colors based on mode and primary color
    const colors = {
      primary: config.color,
      text: config.darkMode ? "#E2E8F0" : "#303235",
      background: config.darkMode ? "#1E293B" : "#FFFFFF",
      surface: config.darkMode ? "#334155" : "#FFFFFF",
      border: config.darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
      secondaryText: config.darkMode ? "#94A3B8" : "#72727a",
      buttonHover: adjustBrightness(config.color, config.darkMode ? 15 : -10), // Adjust hover brightness
      shadow: config.darkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)",
      accent: hexToRgba(config.color, 0.15), // Used for hover/active states
      accentStrong: hexToRgba(config.color, 0.25),
      ghostBorder: hexToRgba(config.color, 0.5),
      successText: config.darkMode ? adjustBrightness(config.color, 60) : config.color, // Brighter/same color for success text
    };


    const formContainer = document.createElement("form");
    formContainer.id = instanceId;
    formContainer.className = "rank-options-form";
    formContainer.setAttribute('aria-labelledby', `${instanceId}-title`);

    formContainer.innerHTML = `
      <style>
        /* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'); */ /* Assume font loaded */

        /* Scoped styles */
        #${instanceId}.rank-options-form {
          display: block;
          font-family: 'Inter', sans-serif;
          max-width: 450px;
          margin: 0 auto;
          padding: 0; /* Reset padding */
           -webkit-font-smoothing: antialiased;
           -moz-osx-font-smoothing: grayscale;
        }

        #${instanceId} .rank-options-container {
          padding: 0;
          width: 100%;
        }

        #${instanceId} .rank-title {
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
             margin-left: ${config.titleSkewDegree < 0 ? Math.abs(config.titleSkewDegree / 2) : -Math.abs(config.titleSkewDegree / 2)}px;
          ` : ''}
        }

        #${instanceId} .rank-options-list {
          list-style: none;
          padding: 0;
          margin: 0 0 16px 0; /* Add margin below list */
          width: 100%;
        }

        #${instanceId} .rank-item { /* Use class for list items */
          display: flex;
          align-items: center;
          padding: 12px 10px 12px 12px; /* Adjust padding */
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
          opacity: 0; /* For intro animation */
          animation: slideIn-${instanceId} 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          animation-delay: calc(var(--item-index) * 0.07s); /* Stagger animation */
        }
         /* Left border indicator on hover */
        #${instanceId} .rank-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: ${colors.primary};
            opacity: 0;
            transition: opacity 0.2s ease;
            border-radius: 10px 0 0 10px; /* Match item radius */
        }

        #${instanceId} .rank-item:hover {
          border-color: ${hexToRgba(colors.primary, 0.4)};
          box-shadow: 0 3px 6px ${colors.shadow};
          transform: translateY(-1px);
        }
        #${instanceId} .rank-item:hover::before {
             opacity: 1;
        }


        #${instanceId} .rank-item.rank-item-active { /* Style when actively grabbed */
          cursor: grabbing;
          background-color: ${colors.accent};
          transform: scale(1.01); /* Slightly larger when grabbed */
        }

        #${instanceId} .rank-options-list.disabled .rank-item {
          cursor: not-allowed;
          opacity: 0.6 !important; /* Ensure disabled opacity overrides hover */
          pointer-events: none;
          box-shadow: none;
          transform: none;
        }
         #${instanceId} .rank-options-list.disabled .rank-item::before {
             opacity: 0; /* Hide indicator when disabled */
         }


        #${instanceId} .rank-number {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0; /* Prevent shrinking */
          min-width: 24px;
          height: 24px;
          background: ${hexToRgba(colors.primary, 0.12)};
          color: ${colors.primary};
          font-size: 12px; /* Slightly smaller rank number */
          font-weight: 600;
          margin-right: 12px;
          user-select: none;
          transition: all 0.2s ease;
          border-radius: 50%;
          padding: 0 2px;
          line-height: 24px; /* Center text vertically */
        }

        #${instanceId} .rank-item:hover .rank-number {
          background: ${colors.primary};
          color: white;
          transform: scale(1.05); /* Slightly larger number on hover */
        }

        #${instanceId} .rank-text {
          flex-grow: 1; /* Take remaining space */
          padding-right: 8px; /* Space before handle */
          line-height: 1.4;
          overflow: hidden; /* Prevent long text overflow */
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${instanceId} .rank-handle { /* Drag handle */
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 3px; /* Space between dots/lines */
            margin-left: auto; /* Push to the right */
            padding: 8px 4px; /* Padding around handle */
            opacity: 0.4;
            transition: opacity 0.2s ease, background-color 0.2s ease;
            border-radius: 4px;
            cursor: grab;
            flex-shrink: 0;
        }
        #${instanceId} .rank-handle:hover {
             background: ${hexToRgba('#000000', config.darkMode ? 0.2 : 0.05)};
             opacity: 0.7;
        }
        #${instanceId} .rank-handle span { /* Dots for handle */
            width: 4px; /* Small dots */
            height: 4px;
            background: ${colors.secondaryText};
            border-radius: 50%;
        }
         #${instanceId} .rank-item:hover .rank-handle span {
             background: ${colors.text}; /* Darker dots on hover */
         }
        #${instanceId} .rank-item-active .rank-handle {
             cursor: grabbing;
        }


        #${instanceId} .submit-button {
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
          /* margin-top: 16px; */ /* Removed top margin, handled by list margin */
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 5px ${hexToRgba(colors.primary, 0.3)};
        }

        #${instanceId} .submit-button:not(:disabled):hover {
          background-color: ${colors.buttonHover};
          transform: translateY(-2px);
          box-shadow: 0 4px 8px ${hexToRgba(colors.primary, 0.4)};
        }

        #${instanceId} .submit-button:not(:disabled):active {
          transform: translateY(0);
          box-shadow: 0 2px 4px ${hexToRgba(colors.primary, 0.3)};
        }

        #${instanceId} .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          /* background-color: ${colors.secondaryText}; */ /* Keep primary color but faded */
          box-shadow: none;
          transform: none;
        }

        /* SortableJS Classes */
        #${instanceId} .sortable-ghost { /* Style for the placeholder */
          opacity: 0.4 !important;
          background: ${colors.accent} !important;
          border: 1px dashed ${colors.ghostBorder} !important;
          box-shadow: none !important;
        }
        #${instanceId} .sortable-ghost * { /* Hide content of ghost */
           visibility: hidden;
        }

        #${instanceId} .sortable-drag { /* Style for the item being dragged */
          opacity: 0.9 !important;
          background-color: ${colors.accentStrong} !important; /* Slightly stronger accent */
          box-shadow: 0 8px 16px ${colors.shadow} !important;
          border-color: ${colors.primary} !important;
          z-index: 1000 !important; /* Ensure it's above other items */
          transform: scale(1.02) !important; /* Slightly larger when dragging */
        }
        #${instanceId} .rank-item.sortable-chosen { /* Item that is selected (before drag starts fully) */
             background-color: ${colors.accent} !important;
             cursor: grabbing;
        }


        @keyframes slideIn-${instanceId} {
          from { opacity: 0; transform: translateX(-15px); }
          to { opacity: 1; transform: translateX(0); }
        }

        #${instanceId} .submitted-message {
          color: ${colors.successText}; /* Use calculated success text color */
          font-size: 14px;
          text-align: center;
          margin-top: 16px;
          font-weight: 500;
          padding: 12px;
          background: ${colors.accent};
          border-radius: 8px;
          border: 1px solid ${hexToRgba(colors.primary, 0.2)};
          animation: fadeIn-${instanceId} 0.5s ease;
          display: none; /* Initially hidden */
          role: status;
        }
         #${instanceId} .submitted-message.visible {
             display: block;
         }

        @keyframes fadeIn-${instanceId} {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>

      <div class="rank-options-container">
        <div class="rank-title" id="${instanceId}-title">${config.title}</div>
        <ul class="rank-options-list" aria-live="polite" aria-relevant="text"> <!-- Announce rank changes -->
          ${config.options.map((option, index) => `
            <li class="rank-item" data-value="${option}" style="--item-index: ${index}" aria-label="Rank ${index + 1}: ${option}. Draggable item.">
              <span class="rank-number" aria-hidden="true">${index + 1}</span>
              <span class="rank-text">${option}</span>
              <div class="rank-handle" aria-label="Drag handle for ${option}">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </li>
          `).join('')}
        </ul>
        <button type="submit" class="submit-button">${config.submitText}</button>
        <div class="submitted-message">${config.submitMessage}</div>
      </div>
    `;

    let isSubmitted = false;
    let sortableInstance: Sortable | null = null;

    // Get references after innerHTML is set
    const rankList = formContainer.querySelector('.rank-options-list') as HTMLUListElement;
    const submitButton = formContainer.querySelector('.submit-button') as HTMLButtonElement;
    const submittedMessageDiv = formContainer.querySelector('.submitted-message') as HTMLDivElement;

    const updateRankNumbers = () => {
      if (isSubmitted) return; // Don't update after submission

      const items = rankList.querySelectorAll<HTMLLIElement>('.rank-item');
      items.forEach((item, index) => {
        const rankNumberSpan = item.querySelector('.rank-number');
        const itemText = item.querySelector('.rank-text')?.textContent || 'item';
        if (rankNumberSpan) {
          rankNumberSpan.textContent = String(index + 1);
        }
        // Update aria-label for screen readers
        item.setAttribute('aria-label', `Rank ${index + 1}: ${itemText}. Draggable item.`);
      });
       // Optional: Provide live region update if needed for complex accessibility
       // rankList.setAttribute('aria-label', `List reordered. Current ranking is ${Array.from(items).map(i => i.dataset.value).join(', ')}`);
    };

    const disableRanking = () => {
      rankList.classList.add('disabled');
      submitButton.disabled = true;

      // Destroy sortable instance if it exists
      if (sortableInstance) {
        try {
          sortableInstance.destroy();
          sortableInstance = null;
           console.log(`RankOptions (${instanceId}): Sortable instance destroyed.`);
        } catch (e) {
            console.error(`RankOptions (${instanceId}): Error destroying Sortable instance -`, e);
        }
      }

      // Show submitted message
      submittedMessageDiv.classList.add('visible');
    };

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      if (isSubmitted) return; // Prevent double submission

      const rankedOptions = Array.from(
        rankList.querySelectorAll<HTMLLIElement>('.rank-item')
      ).map(li => li.dataset.value || ''); // Get the ranked values

      isSubmitted = true;
      disableRanking();

      console.log(`RankOptions (${instanceId}): Submitting ranking:`, rankedOptions);

      // Send data to Voiceflow after a short delay for visual feedback
      setTimeout(() => {
           window.voiceflow.chat.interact({
               type: "complete",
               payload: { rankedOptions }
           });
            // Component might be removed by VF now
      }, 500); // Delay allows message to be seen briefly
    };


    // Append the form to the Voiceflow element
    element.innerHTML = ''; // Clear previous content
    element.appendChild(formContainer);

    // Initialize SortableJS
    try {
      sortableInstance = new Sortable(rankList, {
        animation: 150,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        handle: ".rank-handle", // Use the dedicated handle for dragging
        filter: ".disabled", // Ignore dragging on disabled list
        preventOnFilter: true,
        ghostClass: 'sortable-ghost', // Class for the drop placeholder
        chosenClass: 'sortable-chosen', // Class for the selected item
        dragClass: 'sortable-drag',   // Class for the item being dragged
        forceFallback: false, // Use HTML5 drag&drop where possible
        fallbackTolerance: 3, // Pixels distance fallback event triggers
        delay: 50, // ms delay to start dragging
        delayOnTouchOnly: true, // Only delay for touch
        touchStartThreshold: 5, // Pixels to move before drag starts on touch
        // Accessibility: Announce drag start/end might require more complex listeners
        onStart: (evt) => {
            evt.item.classList.add('rank-item-active'); // Add grabbing style
            if ('vibrate' in navigator) navigator.vibrate(50); // Haptic feedback
        },
        onEnd: (evt) => {
            evt.item.classList.remove('rank-item-active');
            updateRankNumbers(); // Update ranks after drop
        },
        disabled: false, // Initial state
      });
       console.log(`RankOptions (${instanceId}): Sortable instance created.`);
    } catch (e) {
        console.error(`RankOptions (${instanceId}): Failed to initialize SortableJS -`, e);
        rankList.innerHTML = `<li style="color: red;">Error initializing drag & drop.</li>`;
        submitButton.disabled = true; // Disable submit if Sortable fails
    }


    // Attach submit listener to the form
    formContainer.addEventListener("submit", handleSubmit);


    // --- Cleanup Function ---
    return () => {
      console.log(`RankOptions (${instanceId}): Cleaning up.`);
      // Remove event listener
      formContainer.removeEventListener("submit", handleSubmit);

      // Destroy Sortable instance if it exists
      if (sortableInstance) {
        try {
            sortableInstance.destroy();
            sortableInstance = null;
             console.log(`RankOptions (${instanceId}): Sortable instance destroyed during cleanup.`);
        } catch(e) {
             console.error(`RankOptions (${instanceId}): Error destroying Sortable instance during cleanup -`, e);
        }
      }
    };
  },
};
