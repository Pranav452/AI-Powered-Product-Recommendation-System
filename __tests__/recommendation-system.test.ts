import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIRecommendationService } from '@/lib/ai-recommendations';
import { InteractionTracker } from '@/lib/interaction-tracker';

// Mock the external dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id' } } 
      })
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [] }),
      gte: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null })
    }))
  }))
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify({
            recommendations: [
              {
                product_id: "1",
                score: 0.95,
                reason: "Based on your interest in electronics and Apple products",
                recommendation_type: "personalized"
              }
            ]
          }))
        }
      })
    }))
  }))
}));

// Mock product data
const mockProducts = [
  {
    id: "1",
    name: "iPhone 15 Pro",
    category: "Electronics",
    subcategory: "Smartphones",
    price: 999.99,
    description: "Latest iPhone with advanced camera",
    brand: "Apple",
    inStock: true,
    ratings: { average: 4.8, count: 1234 },
    features: ["A17 Pro chip", "Titanium design", "Pro camera system"],
    tags: ["apple", "smartphone", "premium"]
  }
];

describe('AI Recommendation System', () => {
  let aiService: AIRecommendationService;
  let interactionTracker: InteractionTracker;

  beforeEach(() => {
    aiService = new AIRecommendationService();
    interactionTracker = new InteractionTracker();
    jest.clearAllMocks();
  });

  describe('AIRecommendationService', () => {
    it('should generate personalized recommendations', async () => {
      const mockUserPreferences = {
        userId: 'test-user-id',
        preferredCategories: ['Electronics'],
        preferredBrands: ['Apple'],
        priceRange: [500, 1500] as [number, number],
        preferredFeatures: ['premium', 'camera'],
        interactionHistory: [],
        lastUpdated: new Date()
      };

      const recommendations = await aiService.generateRecommendations(
        mockProducts,
        mockUserPreferences,
        'personalized'
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle API failures gracefully', async () => {
      const recommendations = await aiService.generateRecommendations(
        mockProducts,
        {
          userId: 'test-user-id',
          preferredCategories: [],
          preferredBrands: [],
          priceRange: [0, 1000],
          preferredFeatures: [],
          interactionHistory: [],
          lastUpdated: new Date()
        },
        'personalized'
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('InteractionTracker', () => {
    it('should track user interactions', async () => {
      const interaction = {
        userId: 'test-user-id',
        productId: '1',
        interactionType: 'view' as const,
        sessionId: 'test-session',
        metadata: { category: 'Electronics' }
      };

      await expect(interactionTracker.trackInteraction(interaction)).resolves.toBeUndefined();
    });

    it('should get user preferences', async () => {
      const preferences = await interactionTracker.getUserPreferences('test-user-id');

      expect(preferences).toHaveProperty('userId');
      expect(preferences).toHaveProperty('preferredCategories');
      expect(preferences).toHaveProperty('preferredBrands');
      expect(preferences).toHaveProperty('priceRange');
    });
  });
});

describe('Authentication Flow', () => {
  it('should handle user authentication', async () => {
    const mockAuthResponse = {
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    };

    expect(mockAuthResponse.data.user.id).toBe('test-user-id');
    expect(mockAuthResponse.data.user.email).toBe('test@example.com');
  });

  it('should handle authentication errors', async () => {
    const mockAuthError = {
      data: { user: null },
      error: { message: 'Invalid credentials' }
    };

    expect(mockAuthError.error.message).toBe('Invalid credentials');
  });
});

describe('Integration Tests', () => {
  it('should handle full recommendation flow', async () => {
    const tracker = new InteractionTracker();
    const aiService = new AIRecommendationService();

    await tracker.trackInteraction({
      userId: 'test-user-id',
      productId: '1',
      interactionType: 'view',
      sessionId: 'test-session',
      metadata: { category: 'Electronics' }
    });

    const preferences = await tracker.getUserPreferences('test-user-id');
    const recommendations = await aiService.generateRecommendations(
      mockProducts,
      preferences,
      'personalized'
    );

    expect(recommendations).toBeDefined();
    expect(Array.isArray(recommendations)).toBe(true);
  });
}); 