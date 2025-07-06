# AI-Powered Product Recommendation System

An intelligent e-commerce platform built with Next.js, Supabase, and Gemini AI. Features a real product catalog, user authentication, AI-powered recommendations, and full user interaction tracking.

---

## 🚀 Features

- **Product Catalog**: 20+ real products across electronics, clothing, books, and more
- **AI Recommendations**: Gemini API suggests products based on user behavior and product similarity
- **User Authentication**: Secure sign up, login, and protected routes
- **Interaction Tracking**: Likes, views, cart adds, and purchases tracked per user
- **Personalized Experience**: Recommendations adapt to your preferences and actions
- **Modern UI**: Built with shadcn/ui, Tailwind CSS, and responsive design
- **Supabase Backend**: PostgreSQL with Row Level Security (RLS) for privacy
- **Comprehensive Testing**: Jest and React Testing Library for core logic

---

## 🖥️ Demo

- **Home**: [http://localhost:3000](http://localhost:3000)
- **Product Catalog**: [http://localhost:3000/catalog](http://localhost:3000/catalog)
- **AI Recommendations**: [http://localhost:3000/recommendations](http://localhost:3000/recommendations)

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **AI**: Google Gemini API (content-based and collaborative filtering)
- **Testing**: Jest, React Testing Library

---

## 📦 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pranav452/AI-Powered-Product-Recommendation-System.git
   cd AI-Powered-Product-Recommendation-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local` and fill in:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY`

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000)

---

## 🧑‍💻 Usage

- **Browse Products**: Go to `/catalog` to view and filter products
- **Interact**: Like, add to cart, or purchase products (actions update recommendations)
- **Get Recommendations**: Go to `/recommendations` for AI-powered suggestions
- **Authentication**: Sign up or log in to save your preferences

---

## 🗃️ Project Structure

```
app/
  catalog/         # Product catalog page
  recommendations/ # AI recommendations page
components/
  product-catalog.tsx
  recommendations.tsx
  ...
data/
  products.json    # Product data
lib/
  ai-recommendations.ts
  interaction-tracker.ts
  supabase/        # Supabase client/server utils
public/
  data/products.json
```

---

## 🧪 Testing

Run all tests:
```bash
npm test
```

---

## 🌐 Deployment

- Deploy to Vercel or your preferred platform
- Set environment variables in your deployment dashboard

---

## 🙏 Credits

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Google Gemini AI](https://ai.google.dev/gemini-api/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📄 License

MIT
