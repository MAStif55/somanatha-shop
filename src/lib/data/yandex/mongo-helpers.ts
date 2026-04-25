import { ObjectId, Filter, Document } from 'mongodb';

/**
 * Typed helper to create a MongoDB filter for document lookup by ID.
 * Supports both ObjectId (native MongoDB) and string IDs (migrated data).
 */
export function toIdFilter(id: string): Filter<Document> {
    return ObjectId.isValid(id) && id.length === 24
        ? { _id: new ObjectId(id) }
        : { _id: id as unknown as ObjectId };
}

/**
 * Convert a MongoDB document to a typed object by mapping _id to id.
 */
export function docToEntity<T>(doc: Document): T {
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest } as T;
}
