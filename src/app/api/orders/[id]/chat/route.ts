import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data/yandex/mongo-client';
import { OrderRepository } from '@/lib/data';
import { getSession } from '@/actions/auth-actions';
import { getCustomerSession } from '@/actions/customer-auth-actions';
import { chatEmitter, activeClientChats, emailTimers } from '@/utils/chat-emitter';
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

        // If admin is viewing, reset unread flag
        if (adminSession) {
            await OrderRepository.update(orderId, { hasUnreadChat: false } as any);
        }

        // 2. Check if client wants SSE (text/event-stream)
        const acceptHeader = request.headers.get('accept');
        
        if (acceptHeader === 'text/event-stream') {
            const isClient = !adminSession && (!!customerSession || hasOrderCookie);
            
            if (isClient) {
                const currentCount = activeClientChats.get(orderId) || 0;
                activeClientChats.set(orderId, currentCount + 1);
            }

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
                if (isClient) {
                    const currentCount = activeClientChats.get(orderId) || 0;
                    if (currentCount <= 1) {
                        activeClientChats.delete(orderId);
                    } else {
                        activeClientChats.set(orderId, currentCount - 1);
                    }
                }
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

        // If client sends message, mark order as having unread chat for admin
        if (sender === 'client') {
            await OrderRepository.update(orderId, { hasUnreadChat: true } as any);
        }

        // 3. Emit message event for active SSE connections
        chatEmitter.emit('newMessage', savedMessage);

        // 4. Send email alert to customer if master (admin) sent a message
        if (sender === 'admin' && order.email) {
            const clientActive = activeClientChats.has(orderId) && (activeClientChats.get(orderId) || 0) > 0;
            
            if (!clientActive) {
                // Debounce emails to prevent spamming while the admin writes multiple messages
                const existingTimer = emailTimers.get(orderId);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }

                const protocol = request.headers.get('x-forwarded-proto') || 'http';
                const host = request.headers.get('host') || 'localhost:3000';
                const orderLink = `${protocol}://${host}/orders/${orderId}`;
                const msgText = text || '[Вложение]';

                const timer = setTimeout(async () => {
                    emailTimers.delete(orderId);
                    try {
                        await sendEmailNewChatMessage(order.email, orderId, msgText, orderLink);
                    } catch (e) {
                        console.error('[API Chat POST Debounced] Failed to send email notification:', e);
                    }
                }, 2 * 60 * 1000); // 2 minutes debounce delay

                emailTimers.set(orderId, timer);
            }
        }

        return NextResponse.json({ success: true, message: savedMessage });
    } catch (error: any) {
        console.error('[API Chat POST] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
