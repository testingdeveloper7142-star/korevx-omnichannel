import { PrismaClient, UserRole, PlatformType, InteractionType, ConversationStatus, SenderType, AuditAction, AuditResource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos iniciales con Gobernanza y Auditoría en KorevX...');

  // 1. Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'korevx-global' },
    update: {},
    create: {
      name: 'KorevX Global',
      slug: 'korevx-global',
    },
  });

  // 2. Agente Principal
  const agentCarlos = await prisma.user.upsert({
    where: { email: 'carlos@korevx.com' },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: 'carlos@korevx.com',
      fullName: 'Carlos Agente',
      role: UserRole.AGENT,
      passwordHash: 'argon2_hashed_password_secure',
      isOnline: true,
    },
  });

  // 3. Auditoría de inicio de sesión inicial
  await prisma.userSession.create({
    data: {
      userId: agentCarlos.id,
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
      deviceType: 'Desktop (Windows)',
      loginAt: new Date(Date.now() - 3600000), // Hace 1 hora
      isActive: true,
    },
  });

  // 4. Canales Oficiales
  const chanIG = await prisma.channelAccount.upsert({
    where: {
      platform_externalAccountId: {
        platform: PlatformType.INSTAGRAM,
        externalAccountId: 'ig_1784140001',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      platform: PlatformType.INSTAGRAM,
      accountName: 'KorevX Oficial',
      accountHandle: '@korevx_tech',
      externalAccountId: 'ig_1784140001',
      accessToken: 'EAABwz_demo_token_instagram',
      isActive: true,
    },
  });

  const chanFB = await prisma.channelAccount.upsert({
    where: {
      platform_externalAccountId: {
        platform: PlatformType.FACEBOOK,
        externalAccountId: 'fb_1092837465',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      platform: PlatformType.FACEBOOK,
      accountName: 'KorevX Fanpage',
      accountHandle: 'KorevX Soluciones',
      externalAccountId: 'fb_1092837465',
      accessToken: 'EAABwz_demo_token_facebook',
      isActive: true,
    },
  });

  const chanTT = await prisma.channelAccount.upsert({
    where: {
      platform_externalAccountId: {
        platform: PlatformType.TIKTOK,
        externalAccountId: 'tt_7788990011',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      platform: PlatformType.TIKTOK,
      accountName: 'KorevX TikTok',
      accountHandle: '@korevx_official',
      externalAccountId: 'tt_7788990011',
      accessToken: 'act_demo_token_tiktok',
      isActive: true,
    },
  });

  // 5. Contacto: Sofía Valenzuela
  const contactSofia = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: 'Sofía Valenzuela',
      email: 'sofia.valenzuela@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      socialIdentities: {
        create: {
          platform: PlatformType.INSTAGRAM,
          externalId: 'ig_user_sofia_9841',
          handle: 'sofia_v',
          displayName: 'Sofía Valenzuela',
        },
      },
    },
  });

  // 6. Conversación con Ciclo de Vida y Auditoría
  const conv1 = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      channelAccountId: chanIG.id,
      contactId: contactSofia.id,
      externalThreadId: 'ig_thread_9841',
      interactionType: InteractionType.DIRECT_MESSAGE,
      status: ConversationStatus.PENDING,
      unreadCount: 1,
      lastActivityAt: new Date(Date.now() - 250000), // Hace ~4 min
      messages: {
        create: {
          senderType: SenderType.CUSTOMER,
          externalMessageId: 'ig_msg_inbound_001',
          content: '¡Hola! Estoy muy interesada en el plan Enterprise de KorevX. ¿Tienen soporte 24/7 y migración asistida?',
          sentAt: new Date(Date.now() - 250000),
        },
      },
    },
  });

  // 7. Registro de Ciclo de Vida inicial (Línea de Tiempo)
  await prisma.conversationLifecycleLog.create({
    data: {
      conversationId: conv1.id,
      previousStatus: null,
      newStatus: ConversationStatus.PENDING,
      reason: 'Mensaje entrante de Instagram recibido por Webhook',
      durationSeconds: 0,
      createdAt: new Date(Date.now() - 250000),
    },
  });

  // 8. Registro de Auditoría inmutable
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: AuditAction.CREATE,
      resource: AuditResource.CONVERSATION,
      resourceId: conv1.id,
      description: 'Conversación creada automáticamente a partir de webhook oficial de Instagram',
      ipAddress: '157.240.22.35', // IP Meta
      userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      newState: { status: 'PENDING', interactionType: 'DIRECT_MESSAGE' },
      createdAt: new Date(Date.now() - 250000),
    },
  });

  console.log('✅ Datos iniciales sembrados con éxito. Gobernanza y trazabilidad activas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
