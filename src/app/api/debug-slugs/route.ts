import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data/yandex/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDb();
        const products = await db.collection('products').find({}).toArray();
        
        const slugs = new Map();
        const duplicates = [];
        
        for (const p of products) {
            if (p.slug) {
                if (slugs.has(p.slug)) {
                    duplicates.push({
                        slug: p.slug,
                        p1: { id: slugs.get(p.slug)._id.toString(), title: slugs.get(p.slug).title?.ru, status: slugs.get(p.slug).status },
                        p2: { id: p._id.toString(), title: p.title?.ru, status: p.status }
                    });
                } else {
                    slugs.set(p.slug, p);
                }
            }
        }
        
        return NextResponse.json({ duplicates });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
