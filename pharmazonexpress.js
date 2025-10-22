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
      maxSelections: trace.payload?.maxSelections || trace.payload?.options?.length || 0,
      color: trace.payload?.color || "#545857",
      title: trace.payload?.title || "Select your options",
      submitText: trace.payload?.submitText || "Submit",
      cancelText: trace.payload?.cancelText || "Cancel",
      darkMode: trace.payload?.darkMode || false,
      successMessage: trace.payload?.successMessage || "Your selection has been saved",
      slantTitle: trace.payload?.slantTitle || false,
      titleSkewDegree: trace.payload?.titleSkewDegree || -10,
      successDuration: trace.payload?.successDuration || 1000 // Reduced to 1 second
    };

    // Color utilities
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Function to adjust color brightness
    function adjustBrightness(hex, percent) {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      
      r = Math.max(0, Math.min(255, r + percent));
      g = Math.max(0, Math.min(255, g + percent));
      b = Math.max(0, Math.min(255, b + percent));
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Set color scheme based on dark mode preference
    const colors = {
      primary: config.color,
      primaryHover: adjustBrightness(config.color, config.darkMode ? 20 : -15),
      background: config.darkMode ? '#1E293B' : '#FFFFFF',
      surface: config.darkMode ? '#334155' : '#FFFFFF',
      text: config.darkMode ? '#F1F5F9' : '#303235',
      textSecondary: config.darkMode ? '#94A3B8' : '#72727a',
      border: config.darkMode ? '#475569' : 'rgba(0, 0, 0, 0.08)',
      hoverBg: config.darkMode ? '#475569' : 'rgba(0, 0, 0, 0.04)',
      error: '#FF4444'
    };

    const multiSelectContainer = document.createElement("form");
    multiSelectContainer.className = "_1ddzqsn7 multi-select-wrapper";
    multiSelectContainer.id = `multiSelect-${Date.now()}`;

    multiSelectContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        
        ._1ddzqsn7.multi-select-wrapper {
          display: block;
          margin-bottom: 20px;
          position: relative;
        }
        
        .multi-select-container {
          font-family: 'Inter', sans-serif;
          width: 100%;
          max-width: 450px;
          margin: 0 auto;
          position: relative;
          transition: all 0.3s ease;
        }
        
        .multi-select-title {
          font-size: 15px;
          color: ${colors.textSecondary};
          margin-bottom: 14px;
          font-weight: 500;
          ${config.slantTitle ? `
            font-style: italic;
            transform: skewX(${config.titleSkewDegree}deg);
            display: inline-block;
            background: ${hexToRgba(config.color, 0.08)};
            padding: 6px 12px;
            border-radius: 4px;
            color: ${config.color};
            margin-left: -4px;
          ` : ''}
        }
        
        .multi-select-subtitle {
          font-size: 13px;
          color: ${colors.textSecondary};
          margin-bottom: 16px;
          opacity: 0.8;
        }
        
        .multi-select-options {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .option-label {
          display: flex;
          align-items: center;
          padding: 12px;
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          opacity: 0;
          animation: slideIn 0.3s forwards;
        }
        
        .option-label:hover {
          border-color: ${colors.primary};
          transform: translateX(2px);
          background: ${colors.hoverBg};
        }
        
        .checkbox-wrapper {
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
        
        .option-label:hover .checkbox-wrapper {
          border-color: ${colors.primary};
        }
        
        .checkbox-input {
          display: none;
        }
        
        .checkbox-input:checked + .checkbox-wrapper {
          background: ${colors.primary};
          border-color: ${colors.primary};
        }
        
        .checkbox-input:checked + .checkbox-wrapper:after {
          content: '';
          width: 6px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-1px, -1px);
          display: block;
        }
        
        .option-text {
          font-size: 14px;
          color: ${colors.text};
          line-height: 1.4;
        }
        
        .error-message {
          color: ${colors.error};
          font-size: 13px;
          margin: -8px 0 12px;
          display: none;
          animation: slideIn 0.3s ease;
          padding: 10px;
          background: ${hexToRgba(colors.error, 0.1)};
          border-radius: 6px;
          text-align: center;
        }
        
        .button-group {
          display: grid;
          gap: 8px;
        }
        
        .submit-button, .cancel-button {
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
        
        .submit-button {
          background: ${colors.primary};
          color: white;
          box-shadow: 0 2px 5px ${hexToRgba(colors.primary, 0.3)};
        }
        
        .submit-button:not(:disabled):hover {
          background: ${colors.primaryHover};
          transform: translateY(-1px);
          box-shadow: 0 4px 8px ${hexToRgba(colors.primary, 0.4)};
        }
        
        .submit-button:not(:disabled):active {
          transform: translateY(0);
        }
        
        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        .cancel-button {
          background: transparent;
          color: ${colors.textSecondary};
          border: 1px solid ${hexToRgba(colors.textSecondary, 0.2)};
        }
        
        .cancel-button:hover {
          background: ${hexToRgba(colors.textSecondary, 0.1)};
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        .shake {
          animation: shake 0.3s ease;
        }
        
        /* Improved success overlay */
        .success-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${hexToRgba(colors.background, 0.95)};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          opacity: 0;
          pointer-events: none;
          z-index: 10;
          transition: opacity 0.3s ease;
          border-radius: 8px;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .success-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }
        
        .success-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          background: ${hexToRgba(colors.primary, 0.15)};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: scaleIn 0.5s cubic-bezier(0.18, 1.25, 0.6, 1.25) forwards;
          opacity: 0;
        }
        
        .success-icon:after {
          content: '';
          display: block;
          width: 20px;
          height: 10px;
          border: solid ${colors.primary};
          border-width: 0 0 3px 3px;
          transform: rotate(-45deg) translate(2px, -2px);
        }
        
        .success-text {
          font-size: 16px;
          font-weight: 600;
          color: ${colors.text};
          text-align: center;
          opacity: 0;
          animation: fadeIn 0.5s ease forwards 0.3s;
        }
        
        .selected-items {
          margin-top: 12px;
          padding: 12px;
          background: ${hexToRgba(colors.primary, 0.1)};
          border-radius: 8px;
          max-width: 100%;
          text-align: center;
          opacity: 0;
          animation: fadeIn 0.5s ease forwards 0.5s;
        }
        
        .selected-items-title {
          font-size: 13px;
          font-weight: 500;
          color: ${colors.textSecondary};
          margin-bottom: 8px;
        }
        
        .selected-item {
          display: inline-block;
          margin: 4px;
          padding: 6px 10px;
          background: ${hexToRgba(colors.primary, 0.15)};
          color: ${colors.primary};
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      </style>
      
      <div class="multi-select-container">
        <div class="multi-select-title">${config.title}</div>
        ${config.maxSelections < config.options.length ? 
          `<div class="multi-select-subtitle">Choose up to ${config.maxSelections} options</div>` : 
          ''}
        <div class="multi-select-options">
          ${config.options.map((option, index) => `
            <label class="option-label" style="animation-delay: ${index * 0.05}s">
              <input type="checkbox" class="checkbox-input" name="options" value="${option}">
              <div class="checkbox-wrapper"></div>
              <span class="option-text">${option}</span>
            </label>
          `).join('')}
        </div>
        <div class="error-message"></div>
        <div class="button-group">
          <button type="submit" class="submit-button" disabled>${config.submitText}</button>
          <button type="button" class="cancel-button">${config.cancelText}</button>
        </div>
        
        <!-- Improved success overlay -->
        <div class="success-overlay">
          <div class="success-icon"></div>
          <div class="success-text">${config.successMessage}</div>
          <div class="selected-items">
            <div class="selected-items-title">Your selections:</div>
            <div class="selected-items-list"></div>
          </div>
        </div>
      </div>
    `;

    element.innerHTML = '';
    element.appendChild(multiSelectContainer);

    // Get DOM elements
    let isSubmitted = false;
    let hasInteracted = false; // Flag to track if we've sent the interaction
    const errorMessage = multiSelectContainer.querySelector(".error-message");
    const submitButton = multiSelectContainer.querySelector(".submit-button");
    const cancelButton = multiSelectContainer.querySelector(".cancel-button");
    const checkboxes = multiSelectContainer.querySelectorAll('input[type="checkbox"]');
    const successOverlay = multiSelectContainer.querySelector(".success-overlay");
    const selectedItemsList = multiSelectContainer.querySelector(".selected-items-list");
    
    // Auto-scroll function to ensure component is visible
    const scrollIntoView = () => {
      try {
        setTimeout(() => {
          const chatContainer = document.querySelector('.vfrc-chat-container') || 
                               document.querySelector('[class*="chat-container"]');
          
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
          
          multiSelectContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } catch (err) {
        console.warn("Scroll error:", err);
      }
    };
    
    // Call scroll function on initial render
    scrollIntoView();

    const updateSubmitButton = () => {
      if (isSubmitted) return;
      const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
      submitButton.disabled = selectedCount === 0;
    };

    const showError = (message) => {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
      multiSelectContainer.querySelector('.multi-select-options').classList.add('shake');
      setTimeout(() => {
        multiSelectContainer.querySelector('.multi-select-options').classList.remove('shake');
      }, 300);
    };
    
    const disableForm = () => {
      // Disable all inputs in the component
      checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = "0.7";
        checkbox.parentElement.style.cursor = "not-allowed";
        checkbox.parentElement.style.pointerEvents = "none";
      });
      
      submitButton.disabled = true;
      cancelButton.disabled = true;
      
      // Add visual indication that form is disabled
      submitButton.style.opacity = "0.5";
      cancelButton.style.opacity = "0.5";
    };
    
    const showSuccess = (selectedOptions) => {
      // Fill the selected items list
      selectedItemsList.innerHTML = selectedOptions.length > 0 
        ? selectedOptions.map(option => `<span class="selected-item">${option}</span>`).join('')
        : '<span class="selected-item">None selected</span>';
      
      // Display the success overlay with animation
      successOverlay.classList.add("visible");
    };

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        if (isSubmitted) return;
        
        const selectedCount = multiSelectContainer.querySelectorAll('input[name="options"]:checked').length;
        
        if (selectedCount > config.maxSelections) {
          checkbox.checked = false;
          showError(`You can select up to ${config.maxSelections} options`);
        } else {
          errorMessage.style.display = "none";
        }
        
        updateSubmitButton();
      });
    });

    multiSelectContainer.addEventListener("submit", (e) => {
      e.preventDefault();
      if (isSubmitted || hasInteracted) return;

      const selectedOptions = Array.from(
        multiSelectContainer.querySelectorAll('input[name="options"]:checked')
      ).map(input => input.value);

      // Mark as submitted to prevent duplicate submissions
      isSubmitted = true;
      
      // Disable the form controls
      disableForm();
      
      // Show success state with selected options
      showSuccess(selectedOptions);
      
      // IMPORTANT FIX: Send the interact call immediately after a brief delay
      // This ensures the flow continues to the next block
      setTimeout(() => {
        if (!hasInteracted) {
          hasInteracted = true;
          console.log("MultiSelect: Sending complete interaction with options:", selectedOptions);
          
          window.voiceflow.chat.interact({
            type: "complete",
            payload: { options: selectedOptions }
          });
        }
      }, 300); // Short delay to allow success state to appear
    });

    cancelButton.addEventListener("click", () => {
      if (isSubmitted || hasInteracted) return;
      
      hasInteracted = true;
      disableForm();
      
      console.log("MultiSelect: Sending cancel interaction");
      window.voiceflow.chat.interact({
        type: "cancel",
        payload: { options: [] }
      });
    });
    
    // Return a cleanup function
    return () => {
      // If we haven't yet interacted but we're being cleaned up, force an interaction
      if (isSubmitted && !hasInteracted) {
        const selectedOptions = Array.from(
          multiSelectContainer.querySelectorAll('input[name="options"]:checked')
        ).map(input => input.value);
        
        console.log("MultiSelect cleanup: Forcing interaction with options:", selectedOptions);
        
        window.voiceflow.chat.interact({
          type: "complete",
          payload: { options: selectedOptions }
        });
      }
    };
  },
}
