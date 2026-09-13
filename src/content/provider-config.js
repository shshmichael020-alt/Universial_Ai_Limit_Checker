(() => {
  const providerConfig = {
    chatgpt: {
      name: "ChatGPT",
      matches: host => host.includes("chatgpt.com") || host.includes("chat.openai.com"),
      composerSelectors: ["form[aria-label*='message' i]", "form", "textarea", "[contenteditable='true']"],
      sendSelectors: ["button[data-testid*='send' i]", "button[aria-label*='send' i]", "button[type='submit']"]
    },
    claude: {
      name: "Claude",
      matches: host => host.includes("claude.ai"),
      composerSelectors: ["[contenteditable='true']", "textarea", "form"],
      sendSelectors: ["button[aria-label*='send' i]", "button[type='submit']"]
    },
    gemini: {
      name: "Gemini",
      matches: host => host.includes("gemini.google.com"),
      composerSelectors: ["[contenteditable='true']", "textarea", "form"],
      sendSelectors: ["button[aria-label*='send' i]", "button[type='submit']"]
    },
    copilot: {
      name: "Copilot",
      matches: (host, pathname) => host.includes("github.com") && (pathname.includes("copilot") || pathname.includes("/chat")),
      composerSelectors: ["textarea", "[contenteditable='true']", "form"],
      sendSelectors: ["button[aria-label*='send' i]", "button[type='submit']"]
    }
  };

  window.AILimitProviderConfig = {
    getCurrent() {
      const entry = Object.entries(providerConfig).find(([, config]) => config.matches(location.hostname, location.pathname));
      return entry ? { id: entry[0], ...entry[1] } : null;
    }
  };
})();
