'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-[#FAF9F6]">
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Terms of Service</h1>
                <div className="prose max-w-none text-sm sm:text-base">
                    <p>Last updated: January 2026</p>
                    <p>By accessing Somanatha Shop, you agree to comply with these terms of service...</p>
                    {/* Placeholder content */}
                </div>
            </div>
            <Footer />
        </main>
    );
}
