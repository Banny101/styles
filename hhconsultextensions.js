export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_dropdown" || trace.payload?.name === "ext_dropdown",
  render: ({ trace, element }) => {
    const disableFooterInputs = (isDisabled) => {
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
            el.disabled = isDisabled;
            el.style.pointerEvents = isDisabled ? "none" : "auto";
            el.style.opacity = isDisabled ? "0.5" : "1";
            if (el.tagName.toLowerCase() === "textarea") {
              el.style.backgroundColor = isDisabled ? "#f5f5f5" : "";
            }
          });
        });
      }
    };

    const formContainer = document.createElement("form");
    formContainer.className = "_1ddzqsn7";
    const dropdownOptions = trace.payload?.options || [];

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
        margin-bottom: 8px;
      }
      
      .dropdown-extension-input[type="text"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid rgba(84, 88, 87, 0.2);
        border-radius: 6px;
        background: white;
        color: #545857;
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        transition: all 0.2s ease;
        cursor: pointer;
        margin: 0;
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
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border-radius: 6px;
        border: 1px solid rgba(84, 88, 87, 0.15);
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
        display: none;
        z-index: 1000;
        scrollbar-width: thin;
        scrollbar-color: #72727a transparent;
      }

      .dropdown-extension-options div {
        padding: 8px 12px;
        font-size: 13px;
        color: #545857;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dropdown-extension-options div:hover,
      .dropdown-extension-options div.highlighted {
        background-color: rgba(84, 88, 87, 0.08);
      }

      .dropdown-extension-submit {
        width: 100%;
        padding: 8px 16px;
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
        margin: 0;
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
        padding-right: 32px;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .dropdown-extension-options.visible {
        display: block;
        animation: fadeIn 0.2s ease;
      }
    </style>
  
    <div class="dropdown-wrapper">
      <div class="dropdown-extension-container">
        <input 
          type="text" 
          class="dropdown-extension-input dropdown-extension-search" 
          placeholder="Search or select..." 
          autocomplete="off"
          spellcheck="false"
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
    let highlightedIndex = -1;

    const enableSubmitButton = () => {
      const isValidOption = dropdownOptions.includes(hiddenDropdownInput.value);
      submitButton.classList.toggle("enabled", isValidOption);
    };

    const showDropup = () => {
      dropdownOptionsDiv.classList.add("visible");
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
      });
    };

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
          hideDropup();
          dropdownSearch.blur();
          break;
      }
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
      highlightedIndex = -1;
      updateHighlight();
    });

    dropdownSearch.addEventListener("keydown", handleKeyNavigation);

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

    element.appendChild(formContainer);
    disableFooterInputs(true);
  },
};
