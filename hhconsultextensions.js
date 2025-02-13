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
    const dropdownOptions = trace.payload.options || [];

    formContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
      
      .dropdown-wrapper {
        padding: 0 16px;
        max-width: 400px;
        margin: 0 auto;
        font-family: 'Montserrat', sans-serif;
      }
      
      .dropdown-extension-container {
        position: relative;
        width: 100%;
        margin-bottom: 16px;
      }
      
      .dropdown-extension-input[type="text"] {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid rgba(84, 88, 87, 0.2);
        border-radius: 8px;
        background: white;
        color: #545857;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        transition: all 0.2s ease;
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
        bottom: calc(100% + 8px);
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border-radius: 8px;
        border: 1px solid rgba(84, 88, 87, 0.15);
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        display: none;
        z-index: 1000;
      }

      .dropdown-extension-options div {
        padding: 12px 16px;
        font-size: 14px;
        color: #545857;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .dropdown-extension-options div:hover {
        background-color: rgba(84, 88, 87, 0.08);
      }

      .dropdown-extension-submit {
        width: 100%;
        padding: 12px 24px;
        background-color: #545857;
        color: white;
        border: none;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
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
      }

      .dropdown-extension-invalid {
        border-color: #ff4444 !important;
      }

      /* Custom scrollbar */
      .dropdown-extension-options::-webkit-scrollbar {
        width: 6px;
      }

      .dropdown-extension-options::-webkit-scrollbar-track {
        background: transparent;
      }

      .dropdown-extension-options::-webkit-scrollbar-thumb {
        background: #72727a;
        border-radius: 3px;
      }
    </style>
  
    <div class="dropdown-wrapper">
      <div class="dropdown-extension-container">
        <input 
          type="text" 
          class="dropdown-extension-input dropdown-extension-search" 
          placeholder="Select an option..." 
          autocomplete="off"
          readonly
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

    // Handle clicking the input
    dropdownSearch.addEventListener("click", () => {
      const isVisible = dropdownOptionsDiv.style.display === "block";
      dropdownOptionsDiv.style.display = isVisible ? "none" : "block";
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!formContainer.contains(event.target)) {
        dropdownOptionsDiv.style.display = "none";
      }
    });

    // Handle option selection
    dropdownOptionsDiv.addEventListener("click", (event) => {
      if (event.target.tagName === "DIV") {
        const selectedValue = event.target.getAttribute("data-value");
        dropdownSearch.value = selectedValue;
        hiddenDropdownInput.value = selectedValue;
        dropdownOptionsDiv.style.display = "none";
        enableSubmitButton();
      }
    });

    // Handle form submission
    formContainer.addEventListener("submit", (event) => {
      event.preventDefault();

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
