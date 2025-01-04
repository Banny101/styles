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

export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_dropdown" || trace.payload.name === "ext_dropdown",
  render: ({ trace, element }) => {
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

    const formContainer = document.createElement("form");

    const dropdownOptions = trace.payload.options || [];

    formContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap');
      
      .dropdown-extension-form {
        width: 400px; 
        max-width: 100%; 
        margin: 0 auto; 
      }
      
      .dropdown-extension-label {
        font-size: 0.8em;
        color: #888;
        font-family: 'Montserrat', sans-serif;
      }
      .dropdown-extension-input[type="text"], .dropdown-extension-select {
        width: 100%;
        border: none;
        border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
        background: transparent;
        margin: 5px 0;
        outline: none;
        font-family: 'Montserrat', sans-serif;
      }
      .dropdown-extension-invalid {
        border-color: red;
      }
      .dropdown-extension-submit {
        background-color: #545857;
        border: none;
        color: white;
        padding: 10px;
        border-radius: 5px;
        width: 100%;
        cursor: pointer;
        opacity: 0.5;
        pointer-events: none;
        font-family: 'Montserrat', sans-serif;
      }
      .dropdown-extension-submit.enabled {
        opacity: 1;
        pointer-events: auto;
      }
      .dropdown-extension-container {
        position: relative;
        width: 100%;
      }
      .dropdown-extension-options {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 150px;
        overflow-y: auto;
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.1);
        z-index: 999;
        display: none;
        font-family: 'Montserrat', sans-serif;
      }
      .dropdown-extension-options div {
        padding: 10px;
        cursor: pointer;
      }
      .dropdown-extension-options div:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
    </style>
  
    <label class="dropdown-extension-label" for="dropdown">Select an option</label>
    <div class="dropdown-extension-container">
      <input type="text" class="dropdown-extension-input dropdown-extension-search" placeholder="Search..." autocomplete="off">
      <div class="dropdown-extension-options">
        ${dropdownOptions
          .map((option) => `<div data-value="${option}">${option}</div>`)
          .join("")}
      </div>
      <input type="hidden" class="dropdown-extension-input dropdown-extension-hidden" name="dropdown" required>
    </div><br><br>
  
    <input type="submit" class="dropdown-extension-submit" value="Submit">
  `;  

    const dropdownSearch = formContainer.querySelector(".dropdown-extension-search");
    const dropdownOptionsDiv = formContainer.querySelector(".dropdown-extension-options");
    const hiddenDropdownInput = formContainer.querySelector(".dropdown-extension-hidden");
    const submitButton = formContainer.querySelector(".dropdown-extension-submit");

    const enableSubmitButton = () => {
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      if (isValidOption) {
        submitButton.classList.add("enabled");
      } else {
        submitButton.classList.remove("enabled");
      }
    };

    dropdownSearch.addEventListener("click", function () {
      dropdownOptionsDiv.style.display =
        dropdownOptionsDiv.style.display === "block" ? "none" : "block";
    });

    dropdownSearch.addEventListener("input", function () {
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

    dropdownOptionsDiv.addEventListener("click", function (event) {
      if (event.target.tagName === "DIV") {
        const selectedValue = event.target.getAttribute("data-value");
        dropdownSearch.value = selectedValue;
        hiddenDropdownInput.value = selectedValue;
        dropdownOptionsDiv.style.display = "none";
        enableSubmitButton();
      }
    });

    formContainer.addEventListener("submit", function (event) {
      event.preventDefault();

      const dropdown = formContainer.querySelector(".dropdown-extension-hidden");
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);

      if (!isValidOption) {
        dropdownSearch.classList.add("dropdown-extension-invalid");
        return;
      }

      formContainer.querySelector(".dropdown-extension-submit").remove();
      disableFooterInputs(false);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: { dropdown: dropdown.value },
      });
    });

    element.appendChild(formContainer);

    disableFooterInputs(true);
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

export const FileUploadExtension = {
  name: 'FileUpload',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'ext_fileUpload' || trace.payload.name === 'ext_fileUpload',
  render: ({ trace, element }) => {
    const fileUploadContainer = document.createElement('div')
    fileUploadContainer.innerHTML = `
      <style>
        .my-file-upload {
          border: 2px dashed rgba(46, 110, 225, 0.3);
          padding: 20px;
          text-align: center;
          cursor: pointer;
        }
      </style>
      <div class='my-file-upload'>Drag and drop a file here or click to upload</div>
      <input type='file' style='display: none;'>
    `

    const fileInput = fileUploadContainer.querySelector('input[type=file]')
    const fileUploadBox = fileUploadContainer.querySelector('.my-file-upload')

    fileUploadBox.addEventListener('click', function () {
      fileInput.click()
    })

    fileInput.addEventListener('change', function () {
      const file = fileInput.files[0]
      console.log('File selected:', file)

      fileUploadContainer.innerHTML = `<img src="https://s3.amazonaws.com/com.voiceflow.studio/share/upload/upload.gif" alt="Upload" width="50" height="50">`

      var data = new FormData() 
      data.append('UPLOADCARE_PUB_KEY', trace.payload.apiKey)
      data.append('UPLOADCARE_STORE', 'auto')
      data.append('file', file, file.name)

      fetch('https://upload.uploadcare.com/base/', {
        method: 'POST',
        body: data,
      })
        .then((response) => {
          if (response.ok) {
            return response.json()
          } else {
            throw new Error('Upload failed: ' + response.statusText)
          }
        })
        .then((result) => {
          fileUploadContainer.innerHTML =
            '<img src="https://s3.amazonaws.com/com.voiceflow.studio/share/check/check.gif" alt="Done" width="50" height="50">'
          console.log('File uploaded:', result.file)

          const fileUUID = result.file
          const fileURL = 'https://ucarecdn.com/' + fileUUID + '/' + encodeURIComponent(file.name)

          window.voiceflow.chat.interact({
            type: 'complete',
            payload: {
              file: fileURL,
            },
          })
        })
        .catch((error) => {
          console.error(error)
          fileUploadContainer.innerHTML = '<div>Error during upload</div>'
        })
    })

    element.appendChild(fileUploadContainer)
  },
}
