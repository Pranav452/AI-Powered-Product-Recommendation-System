// User interaction tracking service for the recommendation system

import { createClient } from '@/lib/supabase/client';

export interface UserInteraction {
  id: string;
  userId: string;
  productId: string;
  interactionType: 'view' | 'like' | 'purchase' | 'cart_add' | 'wishlist_add';
  timestamp: Date;
  sessionId: string;
  metadata?: {
    searchQuery?: string;
    category?: string;
    price?: number;
    referrer?: string;
    durationOnProduct?: number;
  };
}

export interface UserPreference {
  userId: string;
  preferredCategories: string[];
  preferredBrands: string[];
  priceRange: [number, number];
  preferredFeatures: string[];
  interactionHistory: UserInteraction[];
  lastUpdated: Date;
}

/**
 * Supabase-based interaction tracking service
 * Connects to the actual database tables created in the schema
 */
export class InteractionTracker {
  private supabase = createClient();
  private sessionId: string;

  constructor() {
    // Generate a session ID for this browsing session
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Track user interaction with a product
   */
  async trackInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found for tracking interaction');
        return;
      }

      // Insert interaction into database
      const { error } = await this.supabase
        .from('user_interactions')
        .insert({
          user_id: user.id,
          product_id: interaction.productId,
          interaction_type: interaction.interactionType,
          session_id: this.sessionId,
          metadata: interaction.metadata || {}
        });

      if (error) {
        console.error('Error tracking interaction:', error);
        // Fallback to localStorage if database fails
        this.trackInteractionLocal(interaction);
      }
    } catch (error) {
      console.error('Error tracking interaction:', error);
      // Fallback to localStorage if database fails
      this.trackInteractionLocal(interaction);
    }
  }

  /**
   * Get user preferences and interaction history from database
   */
  async getUserPreferences(userId?: string): Promise<UserPreference> {
    try {
      // Get current user if not provided
      const { data: { user } } = await this.supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        return this.getDefaultPreferences();
      }

      // Get user preferences from database
      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      // Get interaction history
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Convert database data to UserPreference format
      const userPreferences: UserPreference = {
        userId: targetUserId,
        preferredCategories: preferences?.preferred_categories || [],
        preferredBrands: preferences?.preferred_brands || [],
        priceRange: [
          preferences?.price_range_min || 0,
          preferences?.price_range_max || 3000
        ],
        preferredFeatures: preferences?.preferred_features || [],
        interactionHistory: interactions?.map((i: { id: string; product_id: string; interaction_type: string; created_at: string; session_id: string; metadata?: Record<string, unknown> }) => ({
          id: i.id,
          userId: targetUserId,
          productId: i.product_id,
          interactionType: i.interaction_type as 'view' | 'like' | 'purchase' | 'cart_add' | 'wishlist_add',
          timestamp: new Date(i.created_at),
          sessionId: i.session_id,
          metadata: i.metadata || {}
        })) || [],
        lastUpdated: new Date(preferences?.updated_at || new Date())
      };

      return userPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Fallback to localStorage if database fails
      return this.getUserPreferencesLocal(userId);
    }
  }

  /**
   * Update user preferences in database
   */
  async updateUserPreferences(preferences: Partial<UserPreference>): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found for updating preferences');
        return;
      }

      // Upsert user preferences
      const { error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferred_categories: preferences.preferredCategories || [],
          preferred_brands: preferences.preferredBrands || [],
          price_range_min: preferences.priceRange?.[0] || 0,
          price_range_max: preferences.priceRange?.[1] || 3000,
          preferred_features: preferences.preferredFeatures || [],
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating preferences:', error);
        // Fallback to localStorage if database fails
        this.updateUserPreferencesLocal(preferences);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Fallback to localStorage if database fails
      this.updateUserPreferencesLocal(preferences);
    }
  }

  /**
   * Get trending products based on interaction data
   */
  async getTrendingProducts(limit: number = 10): Promise<Array<{ productId: string; score: number }>> {
    try {
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('product_id, interaction_type, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false });

      if (!interactions || interactions.length === 0) {
        return [];
      }

      // Calculate trending scores
      const productScores = new Map<string, number>();
      const weights = { view: 1, like: 3, cart_add: 5, purchase: 10, wishlist_add: 2 };

      interactions.forEach(interaction => {
        const weight = weights[interaction.interaction_type as keyof typeof weights] || 1;
        const currentScore = productScores.get(interaction.product_id) || 0;
        productScores.set(interaction.product_id, currentScore + weight);
      });

      // Sort and return top products
      return Array.from(productScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([productId, score]) => ({ productId, score }));
    } catch (error) {
      console.error('Error getting trending products:', error);
      return [];
    }
  }

  // Fallback localStorage methods (keep existing implementation)
  private trackInteractionLocal(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): void {
    const newInteraction: UserInteraction = {
      id: Math.random().toString(36).substring(2, 15),
      userId: interaction.userId,
      productId: interaction.productId,
      interactionType: interaction.interactionType,
      timestamp: new Date(),
      sessionId: this.sessionId,
      metadata: interaction.metadata || {}
    };

    const stored = localStorage.getItem('user_interactions');
    const interactions: UserInteraction[] = stored ? JSON.parse(stored) : [];
    interactions.push(newInteraction);
    
    // Keep only last 1000 interactions
    if (interactions.length > 1000) {
      interactions.splice(0, interactions.length - 1000);
    }
    
    localStorage.setItem('user_interactions', JSON.stringify(interactions));
  }

  private getUserPreferencesLocal(userId?: string): UserPreference {
    const stored = localStorage.getItem(`user_preferences_${userId || 'anonymous'}`);
    
    if (stored) {
      const preferences = JSON.parse(stored);
      preferences.lastUpdated = new Date(preferences.lastUpdated);
      preferences.interactionHistory = preferences.interactionHistory.map((interaction: { timestamp: string }) => ({
        ...interaction,
        timestamp: new Date(interaction.timestamp)
      }));
      return preferences;
    }

    return this.getDefaultPreferences();
  }

  private updateUserPreferencesLocal(preferences: Partial<UserPreference>): void {
    const userId = preferences.userId || 'anonymous';
    const existing = this.getUserPreferencesLocal(userId);
    
    const updated = {
      ...existing,
      ...preferences,
      lastUpdated: new Date()
    };
    
    localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(updated));
  }

  private getDefaultPreferences(): UserPreference {
    return {
      userId: 'anonymous',
      preferredCategories: [],
      preferredBrands: [],
      priceRange: [0, 3000],
      preferredFeatures: [],
      interactionHistory: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Get all interactions for a specific user
   */
  getUserInteractions(userId: string): UserInteraction[] {
    const interactions = this.getAllInteractions();
    return interactions.filter(interaction => interaction.userId === userId);
  }

  /**
   * Get interaction analytics for a user
   */
  async getUserAnalytics(userId: string) {
    const interactions = this.getUserInteractions(userId);
    const preferences = await this.getUserPreferences(userId);

    // Calculate interaction patterns
    const interactionCounts = interactions.reduce((acc, interaction) => {
      acc[interaction.interactionType] = (acc[interaction.interactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get most viewed categories
    const categoryViews = interactions
      .filter(i => i.interactionType === 'view')
      .reduce((acc, interaction) => {
        const category = interaction.metadata?.category || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Calculate average session duration
    const sessionDurations = interactions
      .filter(i => i.metadata?.durationOnProduct)
      .map(i => i.metadata!.durationOnProduct!);
    
    const avgSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;

    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentInteractions = interactions.filter(
      i => i.timestamp > weekAgo
    );

    return {
      totalInteractions: interactions.length,
      interactionCounts,
      categoryViews,
      avgSessionDuration,
      recentActivity: recentInteractions.length,
      preferredCategories: preferences.preferredCategories,
      preferredBrands: preferences.preferredBrands,
      priceRange: preferences.priceRange,
      accountAge: preferences.lastUpdated
    };
  }

  /**
   * Clear user data (for privacy/testing)
   */
  clearUserData(userId: string): void {
    // Remove user preferences
    localStorage.removeItem(`user_preferences_${userId || 'anonymous'}`);
    
    // Remove user interactions
    const allInteractions = this.getAllInteractions();
    const filteredInteractions = allInteractions.filter(
      interaction => interaction.userId !== userId
    );
    localStorage.setItem('user_interactions', JSON.stringify(filteredInteractions));
    
    console.log('🗑️ User data cleared for:', userId);
  }

  /**
   * Export user data for privacy compliance
   */
  exportUserData(userId: string) {
    const interactions = this.getUserInteractions(userId);
    const preferences = this.getUserPreferences(userId);
    const analytics = this.getUserAnalytics(userId);

    return {
      userId,
      interactions,
      preferences,
      analytics,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Get popular categories based on user interactions
   */
  getPopularCategories(days: number = 30): { category: string; interactions: number }[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentInteractions = this.getAllInteractions()
      .filter(interaction => 
        interaction.timestamp > cutoffDate && 
        interaction.metadata?.category
      );

    const categoryCounts = recentInteractions.reduce((acc, interaction) => {
      const category = interaction.metadata!.category!;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts)
      .map(([category, interactions]) => ({ category, interactions }))
      .sort((a, b) => b.interactions - a.interactions);
  }

  // Private helper methods

  private getAllInteractions(): UserInteraction[] {
    const stored = localStorage.getItem('user_interactions');
    if (!stored) return [];
    
    try {
      const interactions = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return interactions.map((interaction: { timestamp: string }) => ({
        ...interaction,
        timestamp: new Date(interaction.timestamp)
      }));
    } catch (error) {
      console.error('Error parsing interactions from localStorage:', error);
      return [];
    }
  }
}

// Export singleton instance
export const interactionTracker = new InteractionTracker();

// Utility functions for React components
export const useInteractionTracker = () => {
  return {
    trackInteraction: interactionTracker.trackInteraction.bind(interactionTracker),
    getUserPreferences: interactionTracker.getUserPreferences.bind(interactionTracker),
    getUserAnalytics: interactionTracker.getUserAnalytics.bind(interactionTracker),
    clearUserData: interactionTracker.clearUserData.bind(interactionTracker),
    exportUserData: interactionTracker.exportUserData.bind(interactionTracker)
  };
}; 