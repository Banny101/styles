export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_dropdown" || trace.payload.name === "ext_dropdown",
  render: ({ trace, element }) => {
    // Function to disable or enable Voiceflow’s footer input
    const disableFooterInputs = (isDisabled) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv) {
        const shadowRoot = chatDiv.shadowRoot;
        if (shadowRoot) {
          const textareas = shadowRoot.querySelectorAll("textarea");
          textareas.forEach((textarea) => {
            textarea.disabled = isDisabled;
            textarea.style.backgroundColor = isDisabled ? "#d3d3d3" : "";
            textarea.style.opacity = isDisabled ? "0.5" : "";
            textarea.style.pointerEvents = isDisabled ? "none" : "auto";
          });

          const buttons = shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          );
          buttons.forEach((button) => {
            button.disabled = isDisabled;
            button.style.pointerEvents = isDisabled ? "none" : "auto";
          });

          const additionalButtons = shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          );
          additionalButtons.forEach((button) => {
            button.disabled = isDisabled;
            button.style.pointerEvents = isDisabled ? "none" : "auto";
            button.style.opacity = isDisabled ? "0.5" : "";
          });
        }
      }
    };

    // Create a form element as your container
    const formContainer = document.createElement("form");
    const dropdownOptions = trace.payload.options || [];

    // Insert your updated styling + minimal dropdown styles
    formContainer.innerHTML = `
      <style>
        .form-container {
          width: 100%;
          max-width: 800px;
          min-width: 800px;
          margin: auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background: #f9f9f9;
          box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        }
        .form-group {
          margin-bottom: 15px;
        }
        ._1ddzqsn7 {
          display: block;
        }
        
        .form-group label {
          display: block;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
        }
        .invalid {
          border-color: red;
        }
        .submit-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 15px;
          cursor: pointer;
          border-radius: 4px;
          font-size: 16px;
          width: 100%;
        }
        .submit-btn:hover {
          background: #45a049;
        }

        /* Minimal dropdown-specific styling */
        .dropdown-container {
          position: relative;
          width: 100%;
        }
        .dropdown-options {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 150px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ccc;
          z-index: 999;
          display: none; /* opened via JS */
        }
        .dropdown-options div {
          padding: 10px;
          cursor: pointer;
        }
        .dropdown-options div:hover {
          background-color: #eee;
        }
      </style>
      
      <!-- Actual form layout -->
      <div class="form-container">
        
        <!-- A form-group for the dropdown label + search input -->
        <div class="form-group dropdown-container">
          <label for="dropdownSearch">Select an option</label>
          <input 
            id="dropdownSearch"
            type="text" 
            class="search-input" 
            placeholder="Search..." 
            autocomplete="off"
          />
          <div class="dropdown-options">
            ${dropdownOptions
              .map((option) => `<div data-value="${option}">${option}</div>`)
              .join("")}
          </div>
          
          <!-- Hidden input to hold the final selected value -->
          <input 
            type="hidden" 
            class="hidden-input" 
            name="dropdown" 
            required
          />
        </div>
        
        <!-- Submit button -->
        <div class="form-group">
          <button type="submit" class="submit-btn" disabled>Submit</button>
        </div>

      </div>
    `;

    // Grab important elements
    const dropdownSearch = formContainer.querySelector(".search-input");
    const dropdownOptionsDiv = formContainer.querySelector(".dropdown-options");
    const hiddenDropdownInput = formContainer.querySelector(".hidden-input");
    const submitButton = formContainer.querySelector(".submit-btn");

    // Function: enable/disable the submit button
    const enableSubmitButton = () => {
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      submitButton.disabled = !isValidOption;
    };

    // Clicking the search input toggles the dropdown
    dropdownSearch.addEventListener("click", () => {
      dropdownOptionsDiv.style.display =
        dropdownOptionsDiv.style.display === "block" ? "none" : "block";
    });

    // As user types, filter visible options
    dropdownSearch.addEventListener("input", () => {
      const filter = dropdownSearch.value.toLowerCase();
      const options = dropdownOptionsDiv.querySelectorAll("div");
      options.forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(filter) ? "" : "none";
      });
      dropdownOptionsDiv.style.display = "block";
      hiddenDropdownInput.value = "";
      enableSubmitButton();
    });

    // Handle selection of a dropdown option
    dropdownOptionsDiv.addEventListener("click", (event) => {
      if (event.target.tagName === "DIV") {
        const selectedValue = event.target.getAttribute("data-value");
        dropdownSearch.value = selectedValue;
        hiddenDropdownInput.value = selectedValue;
        dropdownOptionsDiv.style.display = "none";
        enableSubmitButton();
      }
    });

    // On form submission
    formContainer.addEventListener("submit", (event) => {
      event.preventDefault();

      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      if (!isValidOption) {
        dropdownSearch.classList.add("invalid");
        return;
      } else {
        dropdownSearch.classList.remove("invalid");
      }

      // Remove submit button to prevent double-submits
      submitButton.remove();

      // Re-enable Voiceflow’s footer
      disableFooterInputs(false);

      // Send the data back to Voiceflow
      window.voiceflow.chat.interact({
        type: "complete",
        payload: { dropdown: hiddenDropdownInput.value },
      });
    });

    // Initially disable the Voiceflow footer inputs
    disableFooterInputs(true);

    // Finally, append the form to the DOM element
    element.appendChild(formContainer);
  },
};

export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => 
    trace.type === "ext_browserData" || 
    trace.payload?.name === "ext_browserData",
  effect: async ({ trace }) => {
    const getCookies = () => {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=').map(c => c.trim());
        acc[name] = value;
        return acc;
      }, {});
      return cookies;
    };

    const getBrowserInfo = () => {
      const userAgent = navigator.userAgent;
      let browserName = "Unknown";
      let browserVersion = "Unknown";

      if (/chrome/i.test(userAgent)) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/chrome\/([\d.]+)/i)?.[1] || "Unknown";
      } else if (/firefox/i.test(userAgent)) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/firefox\/([\d.]+)/i)?.[1] || "Unknown";
      } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
        browserName = "Safari";
        browserVersion = userAgent.match(/version\/([\d.]+)/i)?.[1] || "Unknown";
      } else if (/msie/i.test(userAgent) || /trident/i.test(userAgent)) {
        browserName = "Internet Explorer";
        browserVersion = userAgent.match(/(msie\s|rv:)([\d.]+)/i)?.[2] || "Unknown";
      }

      return { browserName, browserVersion };
    };

    const getViewportSize = () => {
      const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      return { width, height };
    };

    const getIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
      } catch (error) {
        return "Unable to fetch IP address";
      }
    };

    const ip = await getIpAddress();
    const url = window.location.href;
    const params = new URLSearchParams(window.location.search).toString();
    const cookies = getCookies();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const time = new Date().toLocaleTimeString();
    const ts = Math.floor(Date.now() / 1000);
    const userAgent = navigator.userAgent;
    const { browserName, browserVersion } = getBrowserInfo();
    const lang = navigator.language;
    const supportsCookies = navigator.cookieEnabled;
    const platform = navigator.platform;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();

    window.voiceflow.chat.interact({
      type: "complete",
      payload: {
        ip,
        url,
        params,
        cookies,
        timezone,
        time,
        ts,
        userAgent,
        browserName,
        browserVersion,
        lang,
        supportsCookies,
        platform,
        screenResolution: `${screenWidth}x${screenHeight}`,
        viewportSize: `${viewportWidth}x${viewportHeight}`
      }
    });
  }
};
