import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_ANON_KEY

if (!supabaseUrl) {
  console.error('⚠️ Missing Supabase URL. Please check your environment variables.')
}

if (!supabaseAnonKey) {
  console.error('⚠️ Missing Supabase Anon Key. Please check your environment variables.')
}

// Create Supabase client as singleton
let supabaseInstance = null

export const supabase = supabaseInstance || (supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}))

// Authentication helpers
export const auth = {
  // Sign up with email and password
  signUp: async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Reset password
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  },

  // Update user
  updateUser: async (updates) => {
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  },

  // Listen for auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers
export const db = {
  // Generic select function
  from: (table) => supabase.from(table),

  // Real-time subscriptions
  subscribe: (table, callback, filter = '*') => {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: filter, 
          schema: 'public', 
          table: table 
        }, 
        callback
      )
      .subscribe()
  },

  // Unsubscribe from channel
  unsubscribe: (channel) => {
    return supabase.removeChannel(channel)
  },

  // Execute RPC functions
  rpc: (functionName, params = {}) => {
    return supabase.rpc(functionName, params)
  }
}

// Storage helpers
export const storage = {
  // Get storage bucket
  bucket: (bucketName) => supabase.storage.from(bucketName),

  // Upload file
  upload: async (bucketName, path, file, options = {}) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, options)
    return { data, error }
  },

  // Download file
  download: async (bucketName, path) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path)
    return { data, error }
  },

  // Get public URL
  getPublicUrl: (bucketName, path) => {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path)
    return data
  },

  // Remove file
  remove: async (bucketName, paths) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove(paths)
    return { data, error }
  }
}

// Utility functions
export const utils = {
  // Check if user is authenticated
  isAuthenticated: async () => {
    const { session } = await auth.getSession()
    return !!session
  },

  // Get user role
  getUserRole: async () => {
    const { user } = await auth.getUser()
    return user?.user_metadata?.role || user?.app_metadata?.role
  },

  // Handle Supabase errors
  handleError: (error) => {
    console.error('Supabase Error:', error)
    
    if (error?.code === 'PGRST116') {
      return 'No data found'
    }
    
    if (error?.code === '23505') {
      return 'This record already exists'
    }
    
    if (error?.code === '23503') {
      return 'Cannot delete: record is referenced by other data'
    }
    
    return error?.message || 'An unexpected error occurred'
  }
}

export default supabase