-- Simple Database Schema for AI Recommendation System
-- Run this in Supabase Dashboard > SQL Editor

-- User interactions table
CREATE TABLE user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'purchase', 'cart_add', 'wishlist_add')),
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_brands TEXT[] DEFAULT '{}',
    price_range_min DECIMAL(10,2) DEFAULT 0,
    price_range_max DECIMAL(10,2) DEFAULT 3000,
    preferred_features TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product recommendations cache table
CREATE TABLE product_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('personalized', 'trending', 'similar')),
    score DECIMAL(3,2) DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for better performance
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_product_id ON user_interactions(product_id);
CREATE INDEX idx_user_interactions_timestamp ON user_interactions(timestamp);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

CREATE INDEX idx_product_recommendations_user_id ON product_recommendations(user_id);
CREATE INDEX idx_product_recommendations_type ON product_recommendations(recommendation_type);

-- Enable RLS (Row Level Security) on tables
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (users can only access their own data)
CREATE POLICY "Users can manage their own interactions" ON user_interactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own recommendations" ON product_recommendations
    FOR ALL USING (auth.uid() = user_id);

-- Success message
SELECT 'Database schema created successfully!' as message; 