import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data/yandex/mongo-client';
import { OrderRepository } from '@/lib/data';
import { getSession } from '@/actions/auth-actions';
import { getCustomerSession } from '@/actions/customer-auth-actions';
import { chatEmitter } from '@/utils/chat-emitter';
import { sendEmailNewChatMessage } from '@/lib/mailer';
import { cookies } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const orderId = params.id;
    
    // 1. Authenticate user (either Admin, Owner of the order, or has order-specific cookie)
    const adminSession = await getSession();
    const customerSession = await getCustomerSession();
    const hasOrderCookie = cookies().has(`somanatha-allowed-order-${orderId}`);

    if (!adminSession && !customerSession && !hasOrderCookie) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const order = await OrderRepository.getById(orderId);

        if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        // Customer can only view their own order
        if (!adminSession && !hasOrderCookie && customerSession && order.email.toLowerCase() !== customerSession.email.toLowerCase()) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        // 2. Check if client wants SSE (text/event-stream)
        const acceptHeader = request.headers.get('accept');
        
        if (acceptHeader === 'text/event-stream') {
            const responseStream = new TransformStream();
            const writer = responseStream.writable.getWriter();
            const encoder = new TextEncoder();

            // Set up listener for new messages
            const onNewMessage = (msg: any) => {
                if (msg.orderId === orderId) {
                    try {
                        writer.write(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
                    } catch (e) {
                        console.error('Error writing to SSE stream:', e);
                    }
                }
            };

            // Register listener
            chatEmitter.on('newMessage', onNewMessage);

            // Clean up when client disconnects
            request.signal.addEventListener('abort', () => {
                chatEmitter.off('newMessage', onNewMessage);
                try {
                    writer.close();
                } catch (e) {}
            });

            // Keep-alive interval to prevent timeout (ping every 30 seconds)
            const keepAliveInterval = setInterval(() => {
                try {
                    writer.write(encoder.encode(': keep-alive\n\n'));
                } catch (e) {
                    clearInterval(keepAliveInterval);
                }
            }, 30000);

            request.signal.addEventListener('abort', () => {
                clearInterval(keepAliveInterval);
            });

            return new Response(responseStream.readable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
                },
            });
        }

        // 3. Normal request: return full chat history from MongoDB
        const db = await getDb();
        const messages = await db.collection('order_messages')
            .find({ orderId })
            .sort({ createdAt: 1 })
            .toArray();

        return NextResponse.json({ success: true, messages });
    } catch (error: any) {
        console.error('[API Chat GET] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const orderId = params.id;

    // 1. Authenticate user
    const adminSession = await getSession();
    const customerSession = await getCustomerSession();
    const hasOrderCookie = cookies().has(`somanatha-allowed-order-${orderId}`);

    if (!adminSession && !customerSession && !hasOrderCookie) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { text, fileUrl, sender: bodySender } = body;

        if (!text && !fileUrl) {
            return NextResponse.json({ success: false, error: 'Message text or attachment is required' }, { status: 400 });
        }

        const order = await OrderRepository.getById(orderId);

        if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        // Customer can only write to their own order
        if (!adminSession && !hasOrderCookie && customerSession && order.email.toLowerCase() !== customerSession.email.toLowerCase()) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        let sender: 'admin' | 'client' = 'client';
        if (bodySender === 'admin') {
            if (!adminSession) {
                return NextResponse.json({ success: false, error: 'Unauthorized to send as admin' }, { status: 403 });
            }
            sender = 'admin';
        } else {
            if (!customerSession && !adminSession && !hasOrderCookie) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }
            sender = 'client';
        }

        const messageDoc = {
            orderId,
            sender,
            text: text || '',
            fileUrl: fileUrl || null,
            createdAt: Date.now(),
        };

        // 2. Save message to database
        const db = await getDb();
        const result = await db.collection('order_messages').insertOne(messageDoc);
        const savedMessage = { id: result.insertedId.toString(), ...messageDoc };

        // 3. Emit message event for active SSE connections
        chatEmitter.emit('newMessage', savedMessage);

        // 4. Send email alert to customer if master (admin) sent a message
        if (sender === 'admin' && order.email) {
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host') || 'localhost:3000';
            const orderLink = `${protocol}://${host}/orders/${orderId}`;
            
            // Send in background, do not block the chat response
            sendEmailNewChatMessage(order.email, orderId, text || '[Вложение]', orderLink).catch(e => {
                console.error('[API Chat POST] Failed to send email notification:', e);
            });
        }

        return NextResponse.json({ success: true, message: savedMessage });
    } catch (error: any) {
        console.error('[API Chat POST] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
