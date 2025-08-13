// Force logout utility for emergency situations
export const forceLogout = async () => {
  try {
    console.log('🚨 Force logout initiated')
    
    // 1. Clear all localStorage
    localStorage.clear()
    
    // 2. Clear all sessionStorage
    sessionStorage.clear()
    
    // 3. Clear all cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    // 4. Try to call Supabase signOut if available
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.auth.signOut()
        console.log('✅ Supabase signOut called')
      }
    } catch (e) {
      console.log('⚠️ Supabase signOut failed:', e)
    }
    
    // 5. Force redirect to homepage
    console.log('🔄 Redirecting to homepage...')
    window.location.replace('/')
    
  } catch (error) {
    console.error('❌ Force logout error:', error)
    // Last resort - just redirect
    window.location.replace('/')
  }
}

// Emergency logout with countdown
export const emergencyLogout = (reason: string = 'Session terminated') => {
  console.log(`🚨 Emergency logout: ${reason}`)
  
  // Show immediate feedback
  const toast = document.createElement('div')
  toast.innerHTML = `
    <div style="
      position: fixed; 
      top: 20px; 
      right: 20px; 
      background: #ef4444; 
      color: white; 
      padding: 16px; 
      border-radius: 8px; 
      z-index: 9999;
      font-family: system-ui;
      font-size: 14px;
    ">
      ${reason} - Redirecting in 3 seconds...
    </div>
  `
  document.body.appendChild(toast)
  
  // Countdown and logout
  setTimeout(() => {
    toast.remove()
    forceLogout()
  }, 3000)
}
