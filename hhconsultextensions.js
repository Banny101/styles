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
