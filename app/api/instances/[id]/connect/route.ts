import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET /api/instances/[id]/connect: Retrieve QR code or current pairing code
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

    const qrResult = await evolutionApi.getConnectQr(instance.instance_name);
    const stateResult = await evolutionApi.getConnectionState(instance.instance_name);

    if (stateResult.state === 'open' && instance.status !== 'connected') {
      await supabaseAdmin
        .from('whatsapp_instances')
        .update({
          status: 'connected',
          phone_number: stateResult.phone || instance.phone_number,
          connected_at: new Date().toISOString(),
        })
        .eq('id', instanceId);
    }

    return NextResponse.json({
      qr: qrResult.qr,
      state: stateResult.state,
      phone: stateResult.phone,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
