import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution';
import { encryptToken } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';

// GET /api/instances: List user's instances
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const userId = req.headers.get('x-user-id'); // Set from auth middleware/session

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: instances, error } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ instances });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/instances: Create a new tenant instance
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // 1. Check tenant subscription & instance limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    const instanceLimit = subscription?.instance_limit || 1;

    const { count: currentCount } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((currentCount || 0) >= instanceLimit) {
      return NextResponse.json(
        {
          error: `Instance limit reached (${currentCount}/${instanceLimit}). Please upgrade your plan to connect more WhatsApp numbers.`,
        },
        { status: 403 }
      );
    }

    // 2. Generate tenant-scoped instanceName: tenant_<userId>_<timestamp>
    const shortId = userId.replace(/-/g, '').slice(0, 12);
    const instanceName = `tenant_${shortId}_${Date.now()}`;
    const instanceToken = crypto.randomBytes(24).toString('hex');
    const encryptedToken = encryptToken(instanceToken);

    const appUrl = process.env.APP_URL || 'https://your-domain.com';
    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhook/evolution`;

    // 3. Create instance in Evolution API via server-held global admin apikey
    const evoResult = await evolutionApi.createInstance({
      instanceName,
      token: instanceToken,
      webhookUrl,
    });

    if (!evoResult.success) {
      return NextResponse.json(
        { error: evoResult.error || 'Failed to initialize instance in Evolution API' },
        { status: 502 }
      );
    }

    // 4. Save instance in DB
    const { data: newInstance, error: dbError } = await supabaseAdmin
      .from('whatsapp_instances')
      .insert({
        user_id: userId,
        instance_name: instanceName,
        status: 'connecting',
        evolution_token: encryptedToken,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 5. Fetch initial QR Code
    const qrResult = await evolutionApi.getConnectQr(instanceName);

    return NextResponse.json({
      instance: newInstance,
      qr: qrResult.qr,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
