export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) => {
    try {
      return trace.type === "ext_dropdown" || trace.payload?.name === "ext_dropdown";
    } catch (error) {
      console.warn("DropdownExtension match error:", error);
      return false;
    }
  },
  render: ({ trace, element }) => {
    try {
      // Cleanup function to remove event listeners
      const cleanup = new Set();
      
      const addCleanupListener = (element, event, handler) => {
        element.addEventListener(event, handler);
        cleanup.add(() => element.removeEventListener(event, handler));
      };

      // Debounce function for search
      const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        };
      };

      const disableFooterInputs = (isDisabled) => {
        try {
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
                if (el) {
                  el.disabled = isDisabled;
                  el.style.pointerEvents = isDisabled ? "none" : "auto";
                  el.style.opacity = isDisabled ? "0.5" : "1";
                  if (el.tagName.toLowerCase() === "textarea") {
                    el.style.backgroundColor = isDisabled ? "#f5f5f5" : "";
                  }
                }
              });
            });
          }
        } catch (error) {
          console.warn("Error in disableFooterInputs:", error);
        }
      };

      // ... (keep existing HTML and CSS) ...

      const dropdownSearch = formContainer.querySelector(".dropdown-extension-search");
      const dropdownOptionsDiv = formContainer.querySelector(".dropdown-extension-options");
      const hiddenDropdownInput = formContainer.querySelector(".dropdown-extension-hidden");
      const submitButton = formContainer.querySelector(".dropdown-extension-submit");
      let highlightedIndex = -1;
      let isProcessingSubmit = false;

      // Cache dropdown options for better performance
      const cachedOptions = new Map(
        dropdownOptions.map(option => [option.toLowerCase(), option])
      );

      const enableSubmitButton = () => {
        const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
        submitButton.classList.toggle("enabled", isValidOption);
      };

      const showDropup = () => {
        if (!dropdownOptionsDiv.classList.contains("visible")) {
          dropdownOptionsDiv.classList.add("visible");
          // Ensure dropup stays within viewport
          const rect = dropdownOptionsDiv.getBoundingClientRect();
          if (rect.top < 0) {
            dropdownOptionsDiv.style.bottom = "auto";
            dropdownOptionsDiv.style.top = "100%";
          }
        }
      };

      const hideDropup = () => {
        dropdownOptionsDiv.classList.remove("visible");
        highlightedIndex = -1;
        updateHighlight();
      };

      const updateHighlight = () => {
        const options = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
        options.forEach((option, index) => {
          option.classList.toggle("highlighted", index === highlightedIndex);
          if (index === highlightedIndex) {
            option.scrollIntoView({ block: "nearest" });
          }
        });
      };

      // Debounced search function
      const debouncedSearch = debounce((searchTerm) => {
        const filter = searchTerm.toLowerCase();
        const options = dropdownOptionsDiv.querySelectorAll("div");
        
        options.forEach((option) => {
          const text = option.textContent.toLowerCase();
          option.style.display = text.includes(filter) ? "" : "none";
        });
        
        highlightedIndex = -1;
        updateHighlight();
      }, 150);

      const handleKeyNavigation = (e) => {
        const visibleOptions = [...dropdownOptionsDiv.querySelectorAll("div:not([style*='display: none'])")];
        
        switch(e.key) {
          case "ArrowDown":
            e.preventDefault();
            if (!dropdownOptionsDiv.classList.contains("visible")) {
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
              visibleOptions[highlightedIndex].click();
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

      // Event Listeners with cleanup
      addCleanupListener(dropdownSearch, "focus", (e) => {
        e.stopPropagation();
        showDropup();
      });

      addCleanupListener(dropdownSearch, "input", (e) => {
        e.stopPropagation();
        debouncedSearch(e.target.value);
        hiddenDropdownInput.value = "";
        enableSubmitButton();
      });

      addCleanupListener(dropdownSearch, "keydown", handleKeyNavigation);

      addCleanupListener(dropdownOptionsDiv, "click", (e) => {
        e.stopPropagation();
        if (e.target.tagName === "DIV") {
          const selectedValue = e.target.getAttribute("data-value");
          if (selectedValue) {
            dropdownSearch.value = selectedValue;
            hiddenDropdownInput.value = selectedValue;
            hideDropup();
            enableSubmitButton();
            dropdownSearch.blur();
          }
        }
      });

      addCleanupListener(document, "click", (e) => {
        if (!dropdownSearch.contains(e.target) && !dropdownOptionsDiv.contains(e.target)) {
          hideDropup();
        }
      });

      addCleanupListener(formContainer, "submit", async (e) => {
        e.preventDefault();
        if (isProcessingSubmit) return;

        try {
          isProcessingSubmit = true;
          const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
          if (!isValidOption) {
            dropdownSearch.classList.add("dropdown-extension-invalid");
            return;
          }

          submitButton.remove();
          disableFooterInputs(false);

          await window.voiceflow.chat.interact({
            type: "complete",
            payload: { dropdown: hiddenDropdownInput.value },
          });
        } catch (error) {
          console.error("Submit error:", error);
        } finally {
          isProcessingSubmit = false;
        }
      });

      // Cleanup on element removal
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node === element || node.contains(element)) {
              cleanup.forEach(cleanupFn => cleanupFn());
              observer.disconnect();
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });

      element.appendChild(formContainer);
      disableFooterInputs(true);

    } catch (error) {
      console.error("DropdownExtension render error:", error);
      // Fallback UI for error state
      element.innerHTML = `
        <div style="color: #ff4444; padding: 10px;">
          An error occurred. Please try again.
        </div>
      `;
    }
  },
};

export const BrowserDataExtension = {
  name: "BrowserData",
  type: "effect",
  match: ({ trace }) => trace.type === "ext_browserData" || trace.payload.name === "ext_browserData",
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
        browserVersion = userAgent.match(/chrome\/([\d.]+)/i)[1];
      } else if (/firefox/i.test(userAgent)) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/firefox\/([\d.]+)/i)[1];
      } else if (/safari/i.test(userAgent)) {
        browserName = "Safari";
        browserVersion = userAgent.match(/version\/([\d.]+)/i)[1];
      } else if (/msie/i.test(userAgent) || /trident/i.test(userAgent)) {
        browserName = "Internet Explorer";
        browserVersion = userAgent.match(/(msie\s|rv:)([\d.]+)/i)[2];
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

export const MultiSelectExtension = {
  name: "MultiSelect",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_multiselect" ||
    trace.payload.name === "ext_multiselect",
  render: ({ trace, element }) => {
    const { options, maxSelections } = trace.payload;
    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.classList.add("multi-select-form-unique");

    const applyGrayStyleToButton = (apply) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv) {
        const shadowRoot = chatDiv.shadowRoot;
        if (shadowRoot) {
          const buttons = shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          );
          buttons.forEach((button) => {
            button.style.backgroundColor = apply ? "#d3d3d3" : "";
            button.style.opacity = apply ? "0.5" : "";
          });
        }
      }
    };

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
        }
      }
    };

    element.innerHTML = "";

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap');
        
        .multi-select-form-unique {
          display: flex;
          flex-direction: column;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          font-family: 'Montserrat', sans-serif;
          max-width: 400px;
          margin: 20px auto;
        }
        .multi-select-options-unique {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }
        .multi-select-options-unique label {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          background-color: #ffffff;
          border: 1px solid #ced4da;
          cursor: pointer;
          transition: background-color 0.3s, border-color 0.3s;
          font-family: 'Montserrat', sans-serif;
        }
        .multi-select-options-unique input[type="checkbox"] {
          margin-right: 10px;
        }
        .multi-select-options-unique label:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }
        .submit-unique, .cancel-unique {
          background-color: #007bff;
          border: none;
          color: white;
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
          margin-top: 10px;
          font-family: 'Montserrat', sans-serif;
        }
        .submit-unique:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        .submit-unique:hover:not(:disabled) {
          background-color: #0056b3;
        }
        .cancel-unique {
          background-color: #dc3545;
        }
        .cancel-unique:hover {
          background-color: #c82333;
        }
        .button-group-unique {
          display: flex;
          justify-content: space-between;
        }
        .error-message-unique {
          color: #dc3545;
          font-size: 0.9em;
          margin-bottom: 10px;
          font-family: 'Montserrat', sans-serif;
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
      </style>
      <div class="multi-select-options-unique">
        ${options
          .map(
            (option) => `
          <label>
            <input type="checkbox" name="options" value="${option}">
            ${option}
          </label>
        `
          )
          .join("")}
      </div>
      <div class="error-message-unique" style="display: none;"></div>
      <div class="button-group-unique">
        <button type="submit" class="submit-unique" disabled>Select</button>
        <button type="button" class="cancel-unique">Cancel</button>
      </div>
    `;

    const optionsContainer = multiSelectContainer.querySelector(
      ".multi-select-options-unique"
    );
    const errorMessage = multiSelectContainer.querySelector(".error-message-unique");
    const submitButton = multiSelectContainer.querySelector(".submit-unique");
    const checkboxes = optionsContainer.querySelectorAll(
      'input[type="checkbox"]'
    );

    const updateSubmitButtonState = () => {
      const selected = optionsContainer.querySelectorAll(
        'input[name="options"]:checked'
      );
      submitButton.disabled = selected.length === 0;
    };

    const resetForm = () => {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      errorMessage.style.display = "none";
      submitButton.disabled = true;
    };

    resetForm();

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const selected = optionsContainer.querySelectorAll(
          'input[name="options"]:checked'
        );
        if (selected.length > maxSelections) {
          checkbox.checked = false;
          errorMessage.style.display = "block";
          errorMessage.textContent = `You can select up to ${maxSelections} options only.`;
          multiSelectContainer.style.animation = "shake 0.5s";
          setTimeout(() => {
            multiSelectContainer.style.animation = "none";
          }, 500);
        } else {
          errorMessage.style.display = "none";
        }
        updateSubmitButtonState();
      });
    });

    multiSelectContainer.addEventListener("submit", function (event) {
      event.preventDefault();
      const selectedOptions = optionsContainer.querySelectorAll(
        'input[name="options"]:checked'
      );
      const selectedOptionsValues = Array.from(selectedOptions).map(
        (option) => option.value
      );

      disableFooterInputs(false);
      applyGrayStyleToButton(false);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: {
          options: selectedOptionsValues,
        },
      });
      resetForm();
    });

    const cancelButton = multiSelectContainer.querySelector(".cancel-unique");
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();

      disableFooterInputs(false);
      applyGrayStyleToButton(false);

      resetForm();
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: {
          options: [],
        },
      });
    });

    element.appendChild(multiSelectContainer);

    disableFooterInputs(true);
    applyGrayStyleToButton(true);
  },
};

export const RankOptionsExtension = {
  name: "RankOptions",
  type: "response",
  match: ({ trace }) => trace.type === "ext_rankoptions" || trace.payload.name === "ext_rankoptions",
  render: ({ trace, element }) => {
    const { options } = trace.payload;

    const applyGrayStyleToButton = (apply) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv) {
        const shadowRoot = chatDiv.shadowRoot;
        if (shadowRoot) {
          const buttons = shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          );
          buttons.forEach((button) => {
            button.style.backgroundColor = apply ? "#d3d3d3" : "";
            button.style.opacity = apply ? "0.5" : "";
          });
        }
      }
    };

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
        }
      }
    };

    const createForm = () => {
      const formContainer = document.createElement("form");
      formContainer.classList.add("rank-options-form");

      element.innerHTML = "";

      formContainer.innerHTML = `
        <style>
          .rank-options-form {
            display: flex;
            flex-direction: column;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            font-family: 'Montserrat', sans-serif;
            width: 243px;
            color: black;
          }
          .rank-options-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .rank-options-list li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            margin-bottom: 10px;
            background-color: #ffffff;
            border: 1px solid #ced4da;
            border-radius: 4px;
            cursor: grab;
            color: black;
          }
          .rank-options-form .submit-button {
            background-color: #545857;
            border: none;
            color: white;
            padding: 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
            margin-top: 10px;
            font-family: 'Montserrat', sans-serif; 
            font-size: 16px; 
          }
          .rank-options-form .submit-button:hover {
            background-color: #545857;
          }
        </style>
        <h3>Drag and drop to rank options</h4>
        <ul class="rank-options-list">
          ${options.map(option => `
            <li data-value="${option}">
              <span>${option}</span>
            </li>
          `).join('')}
        </ul>
        <button type="submit" class="submit-button">Submit</button>
      `;

      formContainer.addEventListener("submit", function (event) {
        event.preventDefault();
        const rankedOptions = Array.from(formContainer.querySelectorAll('.rank-options-list li'))
          .map(li => li.dataset.value);

        disableFooterInputs(false);
        applyGrayStyleToButton(false);

        window.voiceflow.chat.interact({
          type: "complete",
          payload: { rankedOptions },
        });
      });

      element.appendChild(formContainer);

      initializeSortable();

      disableFooterInputs(true);
      applyGrayStyleToButton(true);
    };

    function initializeSortable() {
      const rankOptionsList = element.querySelector('.rank-options-list');
      if (rankOptionsList) {
        new Sortable(rankOptionsList, {
          animation: 150,
          onEnd: () => {}
        });
      }
    }

    if (typeof Sortable === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => {
        createForm();
      };
      script.onerror = () => {};
      document.head.appendChild(script);
    } else {
      createForm();
    }
  },
};

export const DelayEffectExtension = {
  name: "DelayEffect",
  type: "effect",
  match: ({ trace }) => trace.type === "ext_delay" || trace.payload.name === "ext_delay",
  effect: async ({ trace }) => {
    const { delay } = trace.payload;

    await new Promise(resolve => setTimeout(resolve, delay));

    window.voiceflow.chat.interact({ type: "complete" });
  }
};
