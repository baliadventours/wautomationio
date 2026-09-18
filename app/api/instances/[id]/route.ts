import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET /api/instances/[id]: Get single instance detail with live status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const instanceId = params.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: instance, error } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('user_id', userId)
      .single();

    if (error || !instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Refresh live connection state from Evolution API
    const liveState = await evolutionApi.getConnectionState(instance.instance_name);

    if (liveState.state === 'open' && instance.status !== 'connected') {
      await supabaseAdmin
        .from('whatsapp_instances')
        .update({
          status: 'connected',
          phone_number: liveState.phone || instance.phone_number,
          connected_at: new Date().toISOString(),
        })
        .eq('id', instanceId);
      instance.status = 'connected';
      if (liveState.phone) instance.phone_number = liveState.phone;
    } else if (liveState.state === 'close' && instance.status === 'connected') {
      await supabaseAdmin
        .from('whatsapp_instances')
        .update({ status: 'disconnected' })
        .eq('id', instanceId);
      instance.status = 'disconnected';
    }

    return NextResponse.json({ instance, liveState });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/instances/[id]: Delete instance from DB and Evolution API
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const instanceId = params.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify tenant ownership
    const { data: instance, error } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('user_id', userId)
      .single();

    if (error || !instance) {
      return NextResponse.json({ error: 'Instance not found or unauthorized' }, { status: 404 });
    }

    // 1. Delete instance in Evolution API VPS
    await evolutionApi.deleteInstance(instance.instance_name);

    // 2. Delete instance in DB (cascades to message_logs and automations)
    const { error: deleteError } = await supabaseAdmin
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Instance deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
