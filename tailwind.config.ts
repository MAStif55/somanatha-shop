import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Customize these colors for your brand
            colors: {
                canvas: '#FAF9F6',      // Background color
                primary: {
                    DEFAULT: '#E67E22',   // Primary brand color
                    light: '#F1C40F',     // Lighter variant
                    dark: '#D35400',      // Darker variant
                },
                secondary: '#2D5A27',   // Secondary color
                graphite: '#333333',    // Text color
            },
            fontFamily: {
                // Customize fonts for your brand
                heading: ['Montserrat Alternates', 'sans-serif'],
                body: ['Open Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
