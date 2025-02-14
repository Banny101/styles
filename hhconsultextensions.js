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
            textarea.style.backgroundColor = isDisabled ? "#f5f5f5" : "";
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
    formContainer.className = "_1ddzqsn7";
    const dropdownOptions = trace.payload.options || [];

    formContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
      
      .dropdown-wrapper {
        width: 100%;
        font-family: 'Montserrat', sans-serif;
      }
      
      .dropdown-extension-container {
        position: relative;
        width: 100%;
        margin-bottom: 12px;
      }
      
      .dropdown-extension-input[type="text"] {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid rgba(84, 88, 87, 0.2);
        border-radius: 6px;
        background: white;
        color: #545857;
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        transition: all 0.2s ease;
        cursor: pointer;
      }

      .dropdown-extension-input[type="text"]:focus {
        outline: none;
        border-color: #545857;
        box-shadow: 0 0 0 2px rgba(84, 88, 87, 0.1);
      }

      .dropdown-extension-input[type="text"]::placeholder {
        color: #72727a;
        opacity: 0.7;
      }

      .dropdown-extension-options {
        position: absolute;
        bottom: calc(100% + 4px);
        left: 0;
        right: 0;
        width: 100%;
        max-height: 180px;
        overflow-y: auto;
        background: white;
        border-radius: 6px;
        border: 1px solid rgba(84, 88, 87, 0.15);
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
        display: none;
        z-index: 1000;
      }

      .dropdown-extension-options div {
        padding: 8px 14px;
        font-size: 13px;
        color: #545857;
        cursor: pointer;
        transition: background-color 0.2s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dropdown-extension-options div:hover {
        background-color: rgba(84, 88, 87, 0.08);
      }

      .dropdown-extension-submit {
        width: 100%;
        padding: 10px 20px;
        background-color: #545857;
        color: white;
        border: none;
        border-radius: 6px;
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        opacity: 0.5;
        pointer-events: none;
        transition: all 0.2s ease;
      }

      .dropdown-extension-submit.enabled {
        opacity: 1;
        pointer-events: auto;
      }

      .dropdown-extension-submit.enabled:hover {
        background-color: #72727a;
        transform: translateY(-1px);
      }

      .dropdown-extension-invalid {
        border-color: #ff4444 !important;
      }

      .dropdown-extension-options::-webkit-scrollbar {
        width: 4px;
      }

      .dropdown-extension-options::-webkit-scrollbar-track {
        background: transparent;
      }

      .dropdown-extension-options::-webkit-scrollbar-thumb {
        background: #72727a;
        border-radius: 2px;
      }

      .dropdown-extension-input[type="text"] {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23545857' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 35px;
      }
    </style>
  
    <div class="dropdown-wrapper">
      <div class="dropdown-extension-container">
        <input 
          type="text" 
          class="dropdown-extension-input dropdown-extension-search" 
          placeholder="Search or select..." 
          autocomplete="off"
        >
        <div class="dropdown-extension-options">
          ${dropdownOptions
            .map((option) => `<div data-value="${option}">${option}</div>`)
            .join("")}
        </div>
        <input 
          type="hidden" 
          class="dropdown-extension-input dropdown-extension-hidden" 
          name="dropdown" 
          required
        >
      </div>
      <button type="submit" class="dropdown-extension-submit">Submit</button>
    </div>
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

    const showDropup = () => {
      dropdownOptionsDiv.style.display = "block";
    };

    const hideDropup = () => {
      dropdownOptionsDiv.style.display = "none";
    };

    dropdownSearch.addEventListener("focus", (e) => {
      e.stopPropagation();
      showDropup();
    });

    dropdownSearch.addEventListener("click", (e) => {
      e.stopPropagation();
      showDropup();
    });

    dropdownSearch.addEventListener("input", (e) => {
      e.stopPropagation();
      const filter = dropdownSearch.value.toLowerCase();
      const options = dropdownOptionsDiv.querySelectorAll("div");
      
      options.forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(filter) ? "" : "none";
      });
      
      showDropup();
      hiddenDropdownInput.value = "";
      enableSubmitButton();
    });

    dropdownOptionsDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.tagName === "DIV") {
        const selectedValue = e.target.getAttribute("data-value");
        dropdownSearch.value = selectedValue;
        hiddenDropdownInput.value = selectedValue;
        hideDropup();
        enableSubmitButton();
        dropdownSearch.blur();
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdownSearch.contains(e.target) && !dropdownOptionsDiv.contains(e.target)) {
        hideDropup();
      }
    });

    dropdownOptionsDiv.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    formContainer.addEventListener("submit", (e) => {
      e.preventDefault();

      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      if (!isValidOption) {
        dropdownSearch.classList.add("dropdown-extension-invalid");
        return;
      }

      submitButton.remove();
      disableFooterInputs(false);

      window.voiceflow.chat.interact({
        type: "complete",
        payload: { dropdown: hiddenDropdownInput.value },
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideDropup();
        dropdownSearch.blur();
      }
    });

    element.appendChild(formContainer);
    disableFooterInputs(true);
  },
};
