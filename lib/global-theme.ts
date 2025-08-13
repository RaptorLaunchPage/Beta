// Global Theme Configuration for Raptor Esports CRM
// Ensures consistent theming across all components with improved visibility

export const GLOBAL_THEME = {
  // Enhanced Glassmorphic Base Styles with Better Contrast
  glassmorphic: {
    // Primary containers (cards, modals, panels) - Enhanced visibility
    primary: "bg-black/85 backdrop-blur-lg border border-white/50 shadow-2xl text-white",
    
    // Secondary containers (sidebar, headers) - Improved contrast
    secondary: "bg-black/75 backdrop-blur-md border border-white/40 shadow-xl text-white",
    
    // Subtle containers (dropdowns, tooltips) - Better visibility
    subtle: "bg-black/70 backdrop-blur-sm border border-white/35 shadow-lg text-white",
    
    // Interactive elements (buttons, inputs) - Enhanced contrast
    interactive: "bg-white/15 backdrop-blur-sm border border-white/30 hover:bg-white/25 transition-all duration-200 text-white",
    
    // Loading/overlay states - Improved visibility
    overlay: "bg-black/90 backdrop-blur-md text-white",
    
    // Form inputs with better contrast
    input: "bg-black/60 backdrop-blur-sm border border-white/40 text-white placeholder:text-white/70 focus:border-white/60 focus:bg-black/70",
    
    // Menu items and selections
    menu: "bg-black/80 backdrop-blur-md border border-white/30 hover:bg-black/90 text-white"
  },

  // Background Gradients - Enhanced for better contrast
  backgrounds: {
    // Main app background
    primary: "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900",
    
    // Video background overlay - Darker for better text visibility
    videoOverlay: "bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-slate-900/70",
    
    // Loading screens
    loading: "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900",
    
    // Error/warning states with better contrast
    error: "bg-gradient-to-br from-red-900/30 via-slate-900 to-red-900/30",
    success: "bg-gradient-to-br from-green-900/30 via-slate-900 to-green-900/30",
    warning: "bg-gradient-to-br from-yellow-900/30 via-slate-900 to-yellow-900/30"
  },

  // Enhanced Text Colors with Better Contrast
  text: {
    primary: "text-white drop-shadow-lg",
    secondary: "text-white/90 drop-shadow-md",
    muted: "text-white/80 drop-shadow-sm",
    accent: "text-blue-200 drop-shadow-md",
    success: "text-green-200 drop-shadow-md",
    warning: "text-yellow-200 drop-shadow-md",
    error: "text-red-200 drop-shadow-md",
    // High contrast text for critical information
    highContrast: "text-white font-medium drop-shadow-lg"
  },

  // Enhanced Border Colors
  borders: {
    primary: "border-white/50",
    secondary: "border-white/40",
    subtle: "border-white/25",
    accent: "border-blue-400/60",
    success: "border-green-400/60",
    warning: "border-yellow-400/60",
    error: "border-red-400/60",
    interactive: "border-white/35 hover:border-white/55"
  },

  // Card Variants for Different Use Cases
  cards: {
    // Standard card with excellent visibility
    standard: "bg-black/85 backdrop-blur-lg border border-white/50 shadow-2xl text-white rounded-lg",
    
    // Gradient cards for important metrics
    gradient: "bg-gradient-to-br from-black/80 to-black/90 backdrop-blur-lg border border-white/40 shadow-2xl text-white rounded-lg",
    
    // Interactive cards that respond to hover
    interactive: "bg-black/80 backdrop-blur-lg border border-white/40 hover:border-white/60 hover:bg-black/85 transition-all duration-200 shadow-xl text-white rounded-lg cursor-pointer",
    
    // Warning/error state cards
    warning: "bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 shadow-xl text-white rounded-lg",
    error: "bg-red-900/40 backdrop-blur-lg border border-red-400/60 shadow-xl text-white rounded-lg",
    success: "bg-green-900/40 backdrop-blur-lg border border-green-400/60 shadow-xl text-white rounded-lg"
  },

  // Button Styles with Better Visibility
  buttons: {
    primary: "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg border border-blue-500/50",
    secondary: "bg-white/15 hover:bg-white/25 text-white font-medium shadow-lg border border-white/40",
    outline: "bg-transparent hover:bg-white/10 text-white font-medium border border-white/50 hover:border-white/70",
    ghost: "bg-transparent hover:bg-white/10 text-white font-medium"
  },

  // Z-Index Layers
  zIndex: {
    background: "z-0",
    content: "z-10",
    overlay: "z-20",
    modal: "z-30",
    tooltip: "z-40",
    toast: "z-50"
  },

  // Enhanced Transitions
  transitions: {
    fast: "transition-all duration-150 ease-out",
    normal: "transition-all duration-200 ease-out",
    slow: "transition-all duration-300 ease-out",
    fade: "transition-opacity duration-300 ease-out",
    scale: "transition-transform duration-200 ease-out",
    slideIn: "transition-transform duration-250 ease-out"
  },

  // Enhanced Shadows for Better Depth
  shadows: {
    small: "shadow-lg drop-shadow-lg",
    medium: "shadow-xl drop-shadow-xl",
    large: "shadow-2xl drop-shadow-2xl",
    inner: "shadow-inner",
    text: "drop-shadow-lg",
    glow: "shadow-2xl shadow-blue-500/20"
  },

  // Loading States with Better Visibility
  loading: {
    spinner: "animate-spin rounded-full border-b-2 border-white drop-shadow-lg",
    pulse: "animate-pulse",
    fade: "animate-fade-in",
    container: "bg-black/90 backdrop-blur-lg text-white"
  }
} as const

// Enhanced component style presets
export const COMPONENT_STYLES = {
  // Form containers with better visibility
  formContainer: `${GLOBAL_THEME.glassmorphic.primary} p-6 space-y-6`,
  
  // Auth cards for login/register pages
  authCard: `${GLOBAL_THEME.glassmorphic.primary} border-2 border-white/30`,
  
  // Input fields with enhanced contrast
  input: GLOBAL_THEME.glassmorphic.input,
  
  // Loading containers
  loadingContainer: `${GLOBAL_THEME.backgrounds.loading} min-h-screen flex items-center justify-center`,
  loadingCard: `${GLOBAL_THEME.glassmorphic.primary} p-8 text-center space-y-4`,
  
  // Error states
  errorContainer: `${GLOBAL_THEME.cards.error} p-6`,
  
  // Success states  
  successContainer: `${GLOBAL_THEME.cards.success} p-6`,
  
  // Dashboard metrics cards
  metricCard: `${GLOBAL_THEME.cards.gradient} p-6 hover:scale-105 ${GLOBAL_THEME.transitions.scale}`,
  
  // Interactive list items
  listItem: `${GLOBAL_THEME.glassmorphic.subtle} p-4 hover:bg-black/80 ${GLOBAL_THEME.transitions.normal}`,
  
  // Modal overlays
  modalOverlay: `${GLOBAL_THEME.glassmorphic.overlay} fixed inset-0 ${GLOBAL_THEME.zIndex.modal}`,
  
  // Navigation items
  navItem: `${GLOBAL_THEME.buttons.ghost} px-4 py-2 rounded-lg ${GLOBAL_THEME.transitions.fast}`
} as const

// Theme utility functions
export const createThemeClass = (...classes: string[]) => classes.join(' ')

export const getGlassmorphicStyle = (variant: keyof typeof GLOBAL_THEME.glassmorphic = 'primary') => 
  GLOBAL_THEME.glassmorphic[variant]

export const getCardStyle = (variant: keyof typeof GLOBAL_THEME.cards = 'standard') => 
  GLOBAL_THEME.cards[variant]

export const getButtonStyle = (variant: keyof typeof GLOBAL_THEME.buttons = 'primary') => 
  GLOBAL_THEME.buttons[variant]

// Mobile-specific utilities
export const getMobileOptimizedStyle = (baseStyle: string) => 
  `${baseStyle} text-sm sm:text-base p-3 sm:p-4 lg:p-6`

// High contrast mode utilities
export const getHighContrastStyle = (baseStyle: string) => 
  `${baseStyle} ${GLOBAL_THEME.text.highContrast} ${GLOBAL_THEME.borders.primary}`