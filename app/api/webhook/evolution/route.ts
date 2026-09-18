import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { evolutionApi } from '@/lib/evolution';
import { decryptToken } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify shared webhook secret
    const incomingSecret =
      req.headers.get('apikey') ||
      req.headers.get('x-evolution-secret') ||
      req.headers.get('x-webhook-secret');
    const configuredSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

    if (configuredSecret && incomingSecret !== configuredSecret) {
      console.warn('[Webhook] Unauthorized webhook signature received');
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event || payload.type;
    const instanceName = payload.instance || payload.instanceName;

    if (!instanceName) {
      return NextResponse.json({ message: 'Missing instance name' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ message: 'DB not ready' }, { status: 200 });
    }

    // Lookup instance in database
    const { data: instance } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_name', instanceName)
      .single();

    if (!instance) {
      console.warn(`[Webhook] Instance ${instanceName} not found in database`);
      return NextResponse.json({ message: 'Instance not recognized' }, { status: 200 });
    }

    // 2. Handle CONNECTION_UPDATE
    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = payload.data?.state || payload.state;
      const statusReason = payload.data?.statusReason;
      const ownerJid = payload.data?.owner || payload.owner;
      const phoneNumber = ownerJid ? ownerJid.split('@')[0] : instance.phone_number;

      if (state === 'open') {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({
            status: 'connected',
            phone_number: phoneNumber,
            connected_at: new Date().toISOString(),
          })
          .eq('id', instance.id);
        console.log(`[Webhook] Instance ${instanceName} is now CONNECTED (${phoneNumber})`);
      } else if (state === 'close') {
        const isBanned = statusReason === 403 || statusReason === 401;
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({
            status: isBanned ? 'banned' : 'disconnected',
          })
          .eq('id', instance.id);
        console.log(`[Webhook] Instance ${instanceName} is DISCONNECTED`);
      }

      return NextResponse.json({ received: true });
    }

    // 3. Handle MESSAGES_UPSERT (Incoming WhatsApp Message)
    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      const data = payload.data;
      const messageObj = data?.message || data?.[0]?.message;
      const key = data?.key || data?.[0]?.key;

      // Ignore messages sent by ourselves
      if (key?.fromMe) {
        return NextResponse.json({ received: true, ignored: 'from_me' });
      }

      const remoteJid = key?.remoteJid || '';
      const fromNumber = remoteJid.replace(/@s\.whatsapp\.net|@g\.us/, '');
      
      // Extract text content from various WhatsApp message types
      const textContent =
        messageObj?.conversation ||
        messageObj?.extendedTextMessage?.text ||
        messageObj?.imageMessage?.caption ||
        messageObj?.buttonsResponseMessage?.selectedButtonId ||
        messageObj?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        '';

      if (!textContent) {
        return NextResponse.json({ received: true, note: 'non_text_message' });
      }

      // Log incoming message
      await supabaseAdmin.from('message_logs').insert({
        instance_id: instance.id,
        direction: 'in',
        to_number: instance.phone_number || 'me',
        from_number: fromNumber,
        body: textContent,
        status: 'delivered',
      });

      // 4. AUTOMATION LOOP: Check keyword triggers
      const { data: automations } = await supabaseAdmin
        .from('automations')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('enabled', true);

      if (automations && automations.length > 0) {
        const normalizedMsg = textContent.trim().toLowerCase();

        for (const auto of automations) {
          if (auto.trigger_type === 'keyword') {
            const config = auto.trigger_config || {};
            const targetKeyword = (config.keyword || '').trim().toLowerCase();
            const matchType = config.match_type || 'contains';

            let matched = false;
            if (matchType === 'exact') {
              matched = normalizedMsg === targetKeyword;
            } else if (matchType === 'starts_with') {
              matched = normalizedMsg.startsWith(targetKeyword);
            } else {
              // 'contains' default
              matched = normalizedMsg.includes(targetKeyword);
            }

            if (matched && auto.action_config?.reply_text) {
              const replyText = auto.action_config.reply_text;
              const decryptedToken = instance.evolution_token
                ? decryptToken(instance.evolution_token)
                : undefined;

              // Send automated response via Evolution API
              const sendRes = await evolutionApi.sendTextMessage(
                instance.instance_name,
                fromNumber,
                replyText,
                decryptedToken
              );

              // Log outgoing auto-reply
              await supabaseAdmin.from('message_logs').insert({
                instance_id: instance.id,
                direction: 'out',
                to_number: fromNumber,
                from_number: instance.phone_number,
                body: replyText,
                status: sendRes.success ? 'sent' : 'failed',
              });

              console.log(
                `[Automation] Fired "${auto.name}" for keyword "${targetKeyword}" -> replied to ${fromNumber}`
              );
              break; // Trigger one automation per message match
            }
          }
        }
      }

      return NextResponse.json({ received: true, processed: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
