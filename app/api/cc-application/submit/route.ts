import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord-webhook";

// --- Eligibility Logic ---
function checkEligibility(data: any): boolean {
  // Section 1: Identity & Platform
  if (!data.name || !data.primary_platform || !data.primarily_streams_bgmi) return false;

  // Section 2: Platform Metrics (Conditional)
  // If Instagram is primary, check followers. If YouTube is primary, check subscribers.

  // Streams per week >= 4
  if ((data.streams_per_week || 0) < 4) return false;

  // Avg stream duration >= 1.5
  if ((data.avg_stream_duration || 0) < 1.5) return false;

  // Avg concurrent viewers >= 20
  if ((data.avg_concurrent_viewers || 0) < 20) return false;

  // Avg total live views >= 300
  if ((data.avg_total_live_views || 0) < 300) return false;

  // Reels posted last 30 days >= 8
  if ((data.reels_posted_last_30_days || 0) < 8) return false;

  // Avg views last 5 reels >= 3000
  if ((data.avg_views_last_5_reels || 0) < 3000) return false;

  // Longest inactivity gap <= 4 days
  if ((data.longest_inactivity_gap_days || 0) > 4) return false;

  // Missed planned streams <= 1
  if ((data.missed_planned_streams || 0) > 1) return false;

  // Mandatory Yes/No (Must be Yes)
  if (!data.comfortable_clipping_streams) return false;
  if (!data.comfortable_posting_reels_weekly) return false;
  if (!data.willing_to_use_org_branding) return false;
  if (!data.willing_to_tag_org) return false;
  if (!data.willing_to_do_collabs) return false;
  if (!data.willing_to_share_insights) return false;
  if (!data.willing_to_sign_agreement) return false;

  // Behaviour & Safety
  if (!data.no_cheating_hacks) return false;
  if (!data.no_betting_gambling) return false;
  if (!data.comfortable_content_guidelines) return false;

  return true;
}

function buildDiscordPayload(data: any) {
  const fields = [
    { name: "Name / Alias", value: data.name, inline: true },
    { name: "Primary Platform", value: data.primary_platform, inline: true },
    { name: "Streams BGMI?", value: data.primarily_streams_bgmi ? "Yes" : "No", inline: true },

    { name: "Streams/Week", value: data.streams_per_week?.toString() || "N/A", inline: true },
    { name: "Avg Viewers", value: data.avg_concurrent_viewers?.toString() || "N/A", inline: true },
    { name: "Reels/Month", value: data.reels_posted_last_30_days?.toString() || "N/A", inline: true },

    { name: "Avg Reel Views", value: data.avg_views_last_5_reels?.toString() || "N/A", inline: true },
    { name: "Growth (30d)", value: data.avg_growth_last_30_days?.toString() || "N/A", inline: true },
  ];

  if (data.instagram_follower_count) {
    fields.push({ name: "Insta Followers", value: data.instagram_follower_count.toString(), inline: true });
  }
  if (data.youtube_subscriber_count) {
    fields.push({ name: "YT Subscribers", value: data.youtube_subscriber_count.toString(), inline: true });
  }

  // Social Links
  let links = "";
  if (data.social_links) {
     try {
       const parsed = typeof data.social_links === 'string' ? JSON.parse(data.social_links) : data.social_links;
       Object.entries(parsed).forEach(([k, v]) => {
         links += `**${k}**: ${v}\n`;
       });
     } catch (e) {
       // Ignore JSON parse error
     }
  }

  if (links) {
      fields.push({ name: "Social Links", value: links.substring(0, 1024), inline: false });
  }

  return {
    username: "Raptor CC Applications",
    embeds: [
      {
        title: "🌟 New Eligible Content Creator Application",
        description: `**${data.name}** has applied and meets the eligibility criteria!`,
        color: 0xFACC15, // Gold/Yellow
        fields: fields,
        timestamp: new Date().toISOString(),
        footer: { text: "Raptor Esports CC System" }
      }
    ]
  };
}

export async function POST(req: NextRequest) {
  // Initialize Supabase client lazily inside the handler
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    return NextResponse.json({ success: false, error: 'Internal configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const formData = await req.formData();
    const rawData: any = {};

    // Parse FormData
    for (const [key, value] of formData.entries()) {
      if (key === 'avg_growth_screenshot' || key === 'recent_live_analytics_screenshot') {
        continue; // Handle files separately
      }

      // Handle checkboxes/booleans
      if (value === 'true') rawData[key] = true;
      else if (value === 'false') rawData[key] = false;
      // Handle numbers
      else if (!isNaN(Number(value)) && value !== '' && key !== 'social_links') {
         rawData[key] = Number(value);
      }
      // Handle Arrays/JSON
      else if (key === 'social_links') {
          try {
             rawData[key] = JSON.parse(value as string);
         } catch {
             rawData[key] = {};
         }
      }
      else {
        rawData[key] = value;
      }
    }

    // Ensure bucket exists (best effort)
    await supabase.storage.createBucket('cc-applications', { public: true, fileSizeLimit: 10485760 }).catch(() => {});

    // Handle File Uploads
    const growthFile = formData.get('avg_growth_screenshot') as File | null;
    const analyticsFile = formData.get('recent_live_analytics_screenshot') as File | null;

    if (growthFile && growthFile.size > 0) {
      const path = `growth/${Date.now()}_${growthFile.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('cc-applications')
        .upload(path, growthFile);

      if (!uploadError) {
         const { data: urlData } = supabase.storage.from('cc-applications').getPublicUrl(path);
         rawData.avg_growth_screenshot_url = urlData.publicUrl;
      }
    }

    if (analyticsFile && analyticsFile.size > 0) {
      const path = `analytics/${Date.now()}_${analyticsFile.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('cc-applications')
        .upload(path, analyticsFile);

      if (!uploadError) {
         const { data: urlData } = supabase.storage.from('cc-applications').getPublicUrl(path);
         rawData.recent_live_analytics_screenshot_url = urlData.publicUrl;
      }
    }

    // Determine Eligibility
    const isEligible = checkEligibility(rawData);
    rawData.is_eligible = isEligible;
    rawData.status = 'pending';

    // Save to Database
    const { data, error } = await supabase
      .from('cc_applications')
      .insert(rawData)
      .select()
      .single();

    if (error) {
      console.error('DB Insert Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Trigger Discord Webhook if Eligible
    if (isEligible) {
      const webhookUrl = process.env.NEXT_PUBLIC_APPLICATION_WEBHOOK_URL || process.env.NEXT_PUBLIC_PUBLIC_WEBHOOK_URL;
      if (webhookUrl) {
        const payload = buildDiscordPayload(rawData);
        await sendDiscordWebhook(webhookUrl, payload);
      }
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Submit Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
