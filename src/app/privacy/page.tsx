'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#FAF9F6]">
            <Header />
            <div className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
                <div className="prose max-w-none">
                    <p>Last updated: January 2026</p>
                    <p>Your privacy is important to us. This policy outlines how we collect, use, and protect your information...</p>
                    {/* Placeholder content */}
                    <p>We do not sell your personal data to third parties.</p>
                </div>
            </div>
            <Footer />
        </main>
    );
}
