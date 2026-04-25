export interface Review {
    id: string;
    author: string;
    content: string;
    rating: number;
    sourceUrl?: string;
    createdAt: number; // Unix timestamp (Date.now())
}
