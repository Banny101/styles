export const DropdownExtension = {
  name: "DropdownExtension",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_dropdown" || trace.payload.name === "ext_dropdown",
  render: ({ trace, element }) => {
    // Function to disable or enable Voiceflow's footer input
    const disableFooterInputs = (isDisabled) => {
      const chatDiv = document.getElementById("voiceflow-chat");
      if (chatDiv?.shadowRoot) {
        const elements = {
          textareas: chatDiv.shadowRoot.querySelectorAll("textarea"),
          infoButtons: chatDiv.shadowRoot.querySelectorAll(
            ".c-bXTvXv.c-bXTvXv-lckiv-type-info"
          ),
          chatButtons: chatDiv.shadowRoot.querySelectorAll(
            ".vfrc-chat-input--button.c-iSWgdS"
          ),
        };

        const applyStyles = (element) => {
          element.disabled = isDisabled;
          element.style.backgroundColor = isDisabled ? "#f5f5f5" : "";
          element.style.opacity = isDisabled ? "0.6" : "1";
          element.style.pointerEvents = isDisabled ? "none" : "auto";
        };

        Object.values(elements).forEach(collection => 
          collection.forEach(applyStyles)
        );
      }
    };

    const formContainer = document.createElement("form");
    const dropdownOptions = trace.payload.options || [];

    formContainer.innerHTML = `
      <style>
        .dropdown-form {
          width: 100%;
          max-width: 600px;
          margin: 1rem auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .dropdown-container {
          position: relative;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }

        .dropdown-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }

        .search-input {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-input.invalid {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .dropdown-options {
          position: absolute;
          top: calc(100% - 1rem);
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          display: none;
          scrollbar-width: thin;
        }

        .dropdown-options div {
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .dropdown-options div:hover {
          background: #f1f5f9;
        }

        .submit-button {
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }

        .submit-button:not(:disabled):hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .dropdown-form {
            max-width: 100%;
            margin: 0.5rem;
          }
        }
      </style>

      <div class="dropdown-form">
        <div class="dropdown-container">
          <label class="dropdown-label">Select an option</label>
          <input 
            type="text" 
            class="search-input" 
            placeholder="Type to search..." 
            autocomplete="off"
          />
          <div class="dropdown-options">
            ${dropdownOptions
              .map((option) => `<div data-value="${option}">${option}</div>`)
              .join("")}
          </div>
          <input type="hidden" class="hidden-input" required />
          <button type="submit" class="submit-button" disabled>
            Confirm Selection
          </button>
        </div>
      </div>
    `;

    // Element references
    const elements = {
      search: formContainer.querySelector(".search-input"),
      options: formContainer.querySelector(".dropdown-options"),
      hidden: formContainer.querySelector(".hidden-input"),
      submit: formContainer.querySelector(".submit-button"),
    };

    // Event handlers
    const handlers = {
      toggleDropdown: () => {
        const isVisible = elements.options.style.display === "block";
        elements.options.style.display = isVisible ? "none" : "block";
      },

      filterOptions: () => {
        const filter = elements.search.value.toLowerCase();
        const options = elements.options.querySelectorAll("div");
        
        options.forEach((option) => {
          const matches = option.textContent.toLowerCase().includes(filter);
          option.style.display = matches ? "" : "none";
        });

        elements.options.style.display = "block";
        elements.hidden.value = "";
        elements.submit.disabled = true;
      },

      selectOption: (event) => {
        if (event.target.tagName === "DIV") {
          const value = event.target.getAttribute("data-value");
          elements.search.value = value;
          elements.hidden.value = value;
          elements.options.style.display = "none";
          elements.submit.disabled = false;
          elements.search.classList.remove("invalid");
        }
      },

      handleSubmit: (event) => {
        event.preventDefault();
        
        if (!dropdownOptions.includes(elements.hidden.value)) {
          elements.search.classList.add("invalid");
          return;
        }

        elements.submit.remove();
        disableFooterInputs(false);

        window.voiceflow.chat.interact({
          type: "complete",
          payload: { dropdown: elements.hidden.value },
        });
      }
    };

    // Event listeners
    elements.search.addEventListener("click", handlers.toggleDropdown);
    elements.search.addEventListener("input", handlers.filterOptions);
    elements.options.addEventListener("click", handlers.selectOption);
    formContainer.addEventListener("submit", handlers.handleSubmit);

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!formContainer.contains(event.target)) {
        elements.options.style.display = "none";
      }
    });

    // Initial setup
    disableFooterInputs(true);
    element.appendChild(formContainer);
  },
};
