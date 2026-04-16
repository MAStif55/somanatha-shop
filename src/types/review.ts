export interface Review {
    id: string;
    author: string;
    content: string;
    rating: number;
    sourceUrl?: string;
    createdAt: any; // Using any for timestamp compatibility, can be refined
}
