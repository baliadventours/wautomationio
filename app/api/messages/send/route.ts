import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution';
import { decryptToken } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await req.json();
    const { instance_id, to_number, text } = body;

    if (!instance_id || !to_number || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: instance_id, to_number, text' },
        { status: 400 }
      );
    }

    // 1. Rate Limit check per tenant (max 30 messages / min)
    const rateCheck = checkRateLimit(`tenant:${userId}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${Math.ceil(rateCheck.resetMs / 1000)}s before sending more messages.`,
        },
        { status: 429 }
      );
    }

    // 2. Verify instance belongs to tenant
    const { data: instance, error: instError } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instance_id)
      .eq('user_id', userId)
      .single();

    if (instError || !instance) {
      return NextResponse.json(
        { error: 'WhatsApp instance not found or access denied' },
        { status: 403 }
      );
    }

    if (instance.status !== 'connected') {
      return NextResponse.json(
        { error: `Instance is currently ${instance.status}. Please connect via QR code first.` },
        { status: 400 }
      );
    }

    // 3. Check subscription message limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    const messageLimit = subscription?.message_limit || 1000;
    const periodStart = subscription?.period_start || new Date(Date.now() - 30 * 86400000).toISOString();

    // Count messages sent in current period
    const { count: sentCount } = await supabaseAdmin
      .from('message_logs')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'out')
      .gte('created_at', periodStart);

    if ((sentCount || 0) >= messageLimit) {
      return NextResponse.json(
        {
          error: `Monthly message limit reached (${sentCount}/${messageLimit}). Please upgrade your plan to send more messages.`,
        },
        { status: 403 }
      );
    }

    // 4. Decrypt per-instance token if present
    const decryptedToken = instance.evolution_token ? decryptToken(instance.evolution_token) : undefined;

    // 5. Send message via Evolution API
    const sendResult = await evolutionApi.sendTextMessage(
      instance.instance_name,
      to_number,
      text,
      decryptedToken
    );

    if (!sendResult.success) {
      // Log failed attempt
      await supabaseAdmin.from('message_logs').insert({
        instance_id: instance.id,
        direction: 'out',
        to_number,
        from_number: instance.phone_number,
        body: text,
        status: 'failed',
      });

      return NextResponse.json(
        { error: sendResult.error || 'Failed to dispatch message via Evolution API' },
        { status: 502 }
      );
    }

    // 6. Log successful message
    const { data: logEntry } = await supabaseAdmin
      .from('message_logs')
      .insert({
        instance_id: instance.id,
        direction: 'out',
        to_number,
        from_number: instance.phone_number,
        body: text,
        status: 'sent',
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      log: logEntry,
      remainingRate: rateCheck.remaining,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
