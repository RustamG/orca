import type { ContextualTour } from '../../contextual-tours'

export const BROWSER_EXTENSION_DISCOVERY_TOUR = {
  id: 'browser-extensions',
  steps: [
    {
      id: 'browser-extensions-intro',
      title: 'Bring your Chrome extensions',
      body: 'Open the browser menu to find Extensions. Install from the Chrome Web Store, then pin them next to the address bar.',
      targetSelector: '[data-contextual-tour-target="browser-extensions-control"]',
      requiredForStart: true,
      preferredPlacement: 'bottom',
      control: { kind: 'browser-extension-pin-preview' },
      primaryAction: { kind: 'open-chrome-web-store', label: 'Open Web Store' },
      secondaryAction: { kind: 'complete', label: 'Got it' },
      advanceOnFeatureInteraction: 'browser-extensions'
    }
  ]
} as const satisfies ContextualTour
