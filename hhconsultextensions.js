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
      
      .dropdown-extension-form {
        width: 400px; 
        max-width: 100%; 
        margin: 0 auto;
        font-family: 'Montserrat', sans-serif;
      }
      
      .dropdown-extension-label {
        font-size: 0.9em;
        color: #72727a;
        font-family: 'Montserrat', sans-serif;
        font-weight: 500;
        margin-bottom: 8px;
        display: block;
      }

      .dropdown-extension-input[type="text"] {
        width: 100%;
        padding: 12px;
        border: 1px solid rgba(84, 88, 87, 0.2);
        border-radius: 6px;
        background: white;
        color: #545857;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        transition: all 0.3s ease;
      }

      .dropdown-extension-input[type="text"]:focus {
        outline: none;
        border-color: #545857;
        box-shadow: 0 0 0 2px rgba(84, 88, 87, 0.1);
      }

      .dropdown-extension-invalid {
        border-color: #ff4444 !important;
      }

      .dropdown-extension-submit {
        background-color: #545857;
        border: none;
        color: white;
        padding: 12px;
        border-radius: 6px;
        width: 100%;
        cursor: pointer;
        opacity: 0.5;
        pointer-events: none;
        font-family: 'Montserrat', sans-serif;
        font-weight: 500;
        transition: all 0.3s ease;
        margin-top: 16px;
      }

      .dropdown-extension-submit.enabled {
        opacity: 1;
        pointer-events: auto;
      }

      .dropdown-extension-submit.enabled:hover {
        background-color: #72727a;
      }

      .dropdown-extension-container {
        position: relative;
        width: 100%;
      }

      .dropdown-extension-options {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border: 1px solid rgba(84, 88, 87, 0.2);
        border-radius: 6px;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
        z-index: 999;
        display: none;
        margin-bottom: 8px;
      }

      .dropdown-extension-options div {
        padding: 12px;
        cursor: pointer;
        color: #545857;
        font-size: 14px;
        transition: background-color 0.2s ease;
      }

      .dropdown-extension-options div:hover {
        background-color: rgba(84, 88, 87, 0.1);
      }

      /* Custom scrollbar */
      .dropdown-extension-options::-webkit-scrollbar {
        width: 8px;
      }

      .dropdown-extension-options::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      .dropdown-extension-options::-webkit-scrollbar-thumb {
        background: #72727a;
        border-radius: 4px;
      }
    </style>
  
    <div class="dropdown-extension-form">
      <label class="dropdown-extension-label" for="dropdown">Select an option</label>
      <div class="dropdown-extension-container">
        <input type="text" class="dropdown-extension-input dropdown-extension-search" placeholder="Search..." autocomplete="off">
        <div class="dropdown-extension-options">
          ${dropdownOptions
            .map((option) => `<div data-value="${option}">${option}</div>`)
            .join("")}
        </div>
        <input type="hidden" class="dropdown-extension-input dropdown-extension-hidden" name="dropdown" required>
      </div>
      <input type="submit" class="dropdown-extension-submit" value="Submit">
    </div>
  `;  

    // Rest of the JavaScript remains the same as in your original code
    const dropdownSearch = formContainer.querySelector(".dropdown-extension-search");
    const dropdownOptionsDiv = formContainer.querySelector(".dropdown-extension-options");
    const hiddenDropdownInput = formContainer.querySelector(".dropdown-extension-hidden");
    const submitButton = formContainer.querySelector(".dropdown-extension-submit");

    // ... (keep all the event listeners and functionality the same)

    element.appendChild(formContainer);
    disableFooterInputs(true);
  },
};
