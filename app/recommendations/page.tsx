"use client";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Recommendations } from "@/components/recommendations";
import Link from "next/link";

export default function RecommendationsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-6 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>AI Shopping Assistant</Link>
              <div className="flex items-center gap-4">
                <Link href={"/catalog"} className="text-sm hover:underline">
                  Product Catalog
                </Link>
                <Link href={"/recommendations"} className="text-sm hover:underline font-medium text-blue-600">
                  Recommendations
                </Link>
              </div>
            </div>
            <AuthButton />
          </div>
        </nav>
        
        <div className="flex-1 w-full max-w-5xl p-5">
          <Recommendations 
            products={[]} 
            userId="anonymous"
            onProductInteraction={(interaction) => {
              console.log('Product interaction:', interaction);
            }}
            onRefreshRecommendations={() => {
              console.log('Refreshing recommendations');
            }}
          />
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
} 