import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// =====================
// VALIDATION SCHEMAS
// =====================

const messageFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['conversations', 'messages']).optional(),
  with: z.string().optional(), // User ID for conversation thread
});

const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Penerima wajib dipilih'),
  content: z.string().min(1, 'Pesan tidak boleh kosong').max(5000, 'Pesan maksimal 5000 karakter'),
});

// =====================
// GET: List Messages / Conversations
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses pesan' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = messageFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, type, with: withUserId } = validationResult.data;

    // Get conversation list with unread counts
    if (type === 'conversations') {
      return await getConversations(currentUser.id, page, limit);
    }

    // Get message thread with specific user
    if (withUserId) {
      return await getConversationThread(currentUser.id, withUserId, page, limit);
    }

    // Default: get all messages (admin only)
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke semua pesan' },
        { status: 403 }
      );
    }

    return await getAllMessages(page, limit);

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// Helper: Get Conversations
// =====================

async function getConversations(userId: string, page: number, limit: number) {
  // Get unique conversation partners with last message and unread count
  const conversations = await db.$queryRaw<Array<{
    partnerId: string;
    lastMessageId: string;
    lastMessageContent: string;
    lastMessageCreatedAt: Date;
    lastMessageSenderId: string;
    unreadCount: bigint;
  }>>`
    WITH conversation_partners AS (
      SELECT 
        CASE 
          WHEN "senderId" = ${userId} THEN "receiverId"
          ELSE "senderId"
        END as "partnerId"
      FROM "messages"
      WHERE "senderId" = ${userId} OR "receiverId" = ${userId}
    ),
    unique_partners AS (
      SELECT DISTINCT "partnerId" FROM conversation_partners
    ),
    last_messages AS (
      SELECT DISTINCT ON (
        CASE 
          WHEN "senderId" = ${userId} THEN "receiverId"
          ELSE "senderId"
        END
      )
        id as "lastMessageId",
        content as "lastMessageContent",
        "createdAt" as "lastMessageCreatedAt",
        "senderId" as "lastMessageSenderId",
        CASE 
          WHEN "senderId" = ${userId} THEN "receiverId"
          ELSE "senderId"
        END as "partnerId"
      FROM "messages"
      WHERE "senderId" = ${userId} OR "receiverId" = ${userId}
      ORDER BY 
        CASE 
          WHEN "senderId" = ${userId} THEN "receiverId"
          ELSE "senderId"
        END,
        "createdAt" DESC
    ),
    unread_counts AS (
      SELECT 
        "senderId" as "partnerId",
        COUNT(*) as "unreadCount"
      FROM "messages"
      WHERE "receiverId" = ${userId} AND "isRead" = false
      GROUP BY "senderId"
    )
    SELECT 
      up."partnerId",
      lm."lastMessageId",
      lm."lastMessageContent",
      lm."lastMessageCreatedAt",
      lm."lastMessageSenderId",
      COALESCE(uc."unreadCount", 0) as "unreadCount"
    FROM unique_partners up
    LEFT JOIN last_messages lm ON up."partnerId" = lm."partnerId"
    LEFT JOIN unread_counts uc ON up."partnerId" = uc."partnerId"
    ORDER BY lm."lastMessageCreatedAt" DESC
    LIMIT ${limit}
    OFFSET ${(page - 1) * limit}
  `;

  // Get partner user details
  const partnerIds = conversations.map((c) => c.partnerId);
  
  const partners = await db.user.findMany({
    where: {
      id: { in: partnerIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      isVerified: true,
    },
  });

  // Create a map for quick lookup
  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  // Combine conversation data with partner info
  const conversationsWithPartners = conversations.map((conv) => ({
    partner: partnerMap.get(conv.partnerId) || null,
    lastMessage: {
      id: conv.lastMessageId,
      content: conv.lastMessageContent,
      createdAt: conv.lastMessageCreatedAt,
      isSent: conv.lastMessageSenderId === userId,
    },
    unreadCount: Number(conv.unreadCount),
  }));

  // Get total count for pagination
  const totalResult = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT 
      CASE 
        WHEN "senderId" = ${userId} THEN "receiverId"
        ELSE "senderId"
      END
    ) as count
    FROM "messages"
    WHERE "senderId" = ${userId} OR "receiverId" = ${userId}
  `;

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    success: true,
    data: conversationsWithPartners,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
}

// =====================
// Helper: Get Conversation Thread
// =====================

async function getConversationThread(
  userId: string,
  partnerId: string,
  page: number,
  limit: number
) {
  // Verify partner exists
  const partner = await db.user.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      isVerified: true,
    },
  });

  if (!partner) {
    return NextResponse.json(
      { error: 'Pengguna tidak ditemukan' },
      { status: 404 }
    );
  }

  const skip = (page - 1) * limit;

  // Get messages between users
  const [messages, total] = await Promise.all([
    db.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.message.count({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Mark unread messages as read
  await db.message.updateMany({
    where: {
      senderId: partnerId,
      receiverId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      partner,
      messages: messages.reverse(), // Reverse to show oldest first
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
}

// =====================
// Helper: Get All Messages (Admin)
// =====================

async function getAllMessages(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    db.message.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    }),
    db.message.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    success: true,
    data: messages,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
}

// =====================
// POST: Send Message
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengirim pesan' },
        { status: 401 }
      );
    }

    // Check if user is verified and active
    if (!currentUser.isVerified || currentUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Akun Anda belum terverifikasi. Silakan lengkapi verifikasi terlebih dahulu.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = sendMessageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const messageData = validationResult.data;

    // Cannot send message to self
    if (messageData.receiverId === currentUser.id) {
      return NextResponse.json(
        { error: 'Tidak dapat mengirim pesan ke diri sendiri' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: messageData.receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Penerima tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if receiver is active
    if (receiver.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Penerima tidak aktif' },
        { status: 400 }
      );
    }

    // Create message
    const message = await db.message.create({
      data: {
        senderId: currentUser.id,
        receiverId: messageData.receiverId,
        content: messageData.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Create notification for receiver
    await db.notification.create({
      data: {
        userId: messageData.receiverId,
        type: 'MESSAGE_NEW',
        title: 'Pesan Baru',
        message: `${currentUser.name} mengirim pesan baru`,
        data: JSON.stringify({ 
          messageId: message.id, 
          senderId: currentUser.id,
          senderName: currentUser.name,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dikirim',
      data: message,
    }, { status: 201 });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
