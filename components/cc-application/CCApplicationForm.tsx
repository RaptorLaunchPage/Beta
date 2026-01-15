"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- Validation Schema ---
const formSchema = z.object({
  // Section 1
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  primary_platform: z.enum(["YouTube", "Instagram"]),
  secondary_platform: z.enum(["YouTube", "Instagram", "None"]).optional(),
  primarily_streams_bgmi: z.boolean(),

  // Section 2
  instagram_follower_count: z.number().optional(),
  youtube_subscriber_count: z.number().optional(),
  avg_growth_last_30_days: z.number().optional(),
  // file: avg_growth_screenshot handled manually

  // Section 3
  streams_per_week: z.number().min(0),
  avg_stream_duration: z.number().min(0),
  typical_streaming_days: z.array(z.string()).min(1, "Select at least one day"),
  fixed_schedule: z.boolean(),

  // Section 4
  avg_concurrent_viewers: z.number().min(0),
  avg_total_live_views: z.number().min(0),
  chat_activity_rating: z.number().min(1).max(10).optional(),
  // file: recent_live_analytics_screenshot

  // Section 5
  reels_posted_last_30_days: z.number().min(0),
  avg_views_last_5_reels: z.number().min(0),
  youtube_long_videos_last_30_days: z.number().optional(),
  comfortable_clipping_streams: z.boolean().refine(val => val === true, "Required"),
  comfortable_posting_reels_weekly: z.boolean().refine(val => val === true, "Required"),

  // Section 6
  longest_inactivity_gap_days: z.number().min(0),
  missed_planned_streams: z.number().min(0),
  uses_content_calendar: z.boolean().optional(),

  // Section 7
  willing_to_use_org_branding: z.boolean().refine(val => val === true, "Required"),
  willing_to_tag_org: z.boolean().refine(val => val === true, "Required"),
  willing_to_do_collabs: z.boolean().refine(val => val === true, "Required"),
  willing_to_share_insights: z.boolean().refine(val => val === true, "Required"),
  willing_to_sign_agreement: z.boolean().refine(val => val === true, "Required"),

  // Section 8
  discord_knowledge: z.boolean().optional(),
  actively_engages_discord: z.boolean().optional(),
  hosted_community_games: z.boolean().optional(),
  collaborated_before: z.boolean().optional(),

  // Section 9
  no_cheating_hacks: z.boolean().refine(val => val === true, "Must confirm"),
  no_betting_gambling: z.boolean().refine(val => val === true, "Must confirm"),
  comfortable_content_guidelines: z.boolean().refine(val => val === true, "Must confirm"),

  // Section 10
  why_join: z.string().min(10, "Please elaborate"),
  support_needed: z.string().min(5, "Please specify"),
  social_links_youtube: z.string().url().optional().or(z.literal("")),
  social_links_instagram: z.string().url().optional().or(z.literal("")),
  social_links_discord: z.string().optional(),
  additional_info: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CCApplicationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [growthFile, setGrowthFile] = useState<File | null>(null);
  const [analyticsFile, setAnalyticsFile] = useState<File | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      primary_platform: "YouTube",
      secondary_platform: "None",
      primarily_streams_bgmi: false,
      streams_per_week: 0,
      avg_stream_duration: 0,
      typical_streaming_days: [],
      fixed_schedule: false,
      avg_concurrent_viewers: 0,
      avg_total_live_views: 0,
      reels_posted_last_30_days: 0,
      avg_views_last_5_reels: 0,
      comfortable_clipping_streams: false,
      comfortable_posting_reels_weekly: false,
      longest_inactivity_gap_days: 0,
      missed_planned_streams: 0,
      willing_to_use_org_branding: false,
      willing_to_tag_org: false,
      willing_to_do_collabs: false,
      willing_to_share_insights: false,
      willing_to_sign_agreement: false,
      no_cheating_hacks: false,
      no_betting_gambling: false,
      comfortable_content_guidelines: false,
      why_join: "",
      support_needed: "",
    },
  });

  const { watch, control, register, formState: { errors } } = form;
  const primaryPlatform = watch("primary_platform");
  const streamsPerWeek = watch("streams_per_week");
  const avgStreamDuration = watch("avg_stream_duration");
  const typicalStreamingDays = watch("typical_streaming_days");
  const avgConcurrentViewers = watch("avg_concurrent_viewers");
  const avgTotalLiveViews = watch("avg_total_live_views");
  const reelsPosted = watch("reels_posted_last_30_days");
  const avgReelViews = watch("avg_views_last_5_reels");
  const inactivityGap = watch("longest_inactivity_gap_days");
  const missedStreams = watch("missed_planned_streams");

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append all fields
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('social_links_')) return; // Handle separately
        if (value === undefined || value === null) return;

        if (key === 'typical_streaming_days') {
           formData.append(key, JSON.stringify(value));
        } else {
           formData.append(key, value.toString());
        }
      });

      // Construct social_links JSON
      const socialLinks: any = {};
      if (data.social_links_youtube) socialLinks.youtube = data.social_links_youtube;
      if (data.social_links_instagram) socialLinks.instagram = data.social_links_instagram;
      if (data.social_links_discord) socialLinks.discord = data.social_links_discord;
      formData.append('social_links', JSON.stringify(socialLinks));

      // Append files
      if (growthFile) formData.append('avg_growth_screenshot', growthFile);
      if (analyticsFile) formData.append('recent_live_analytics_screenshot', analyticsFile);

      const res = await fetch('/api/cc-application/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Submission failed");

      toast.success("Application submitted successfully!");
      router.push('/join-us?success=true'); // Redirect to a success page or back to join-us
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to show soft warnings
  const Warning = ({ show, message }: { show: boolean, message: string }) => {
    if (!show) return null;
    return (
      <div className="text-amber-500 text-sm flex items-center gap-1 mt-1">
        <AlertTriangle className="w-3 h-3" />
        {message}
      </div>
    );
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto py-8">
        <div className="space-y-2 text-center mb-8">
            <h1 className="text-3xl font-bold">Content Creator Application</h1>
            <p className="text-muted-foreground">Join the Raptor Esports creator team. Show us what you&apos;ve got!</p>
        </div>

      {/* Section 1: Identity & Platform */}
      <Card>
        <CardHeader>
          <CardTitle>1. Identity & Platform</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Streamer Name / Alias *</Label>
            <Input {...register("name")} placeholder="Your IGN or Streamer Name" />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email (Optional)</Label>
             <Input {...register("email")} placeholder="contact@example.com" />
          </div>

          <div className="space-y-2">
            <Label>Primary Platform *</Label>
            <Controller
              control={control}
              name="primary_platform"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Secondary Platform</Label>
            <Controller
              control={control}
              name="secondary_platform"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center space-x-2 md:col-span-2">
            <Controller
                control={control}
                name="primarily_streams_bgmi"
                render={({ field }) => (
                    <Checkbox id="bgmi" checked={field.value} onCheckedChange={field.onChange} />
                )}
            />
            <Label htmlFor="bgmi">Do you primarily stream BGMI? *</Label>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Platform Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>2. Platform Metrics</CardTitle>
          <CardDescription>Fill in metrics for your primary platform.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {primaryPlatform === 'Instagram' && (
             <div className="space-y-2">
                <Label>Instagram Follower Count *</Label>
                <Input type="number" {...register("instagram_follower_count", { valueAsNumber: true })} />
             </div>
          )}

          {primaryPlatform === 'YouTube' && (
             <div className="space-y-2">
                <Label>YouTube Subscriber Count *</Label>
                <Input type="number" {...register("youtube_subscriber_count", { valueAsNumber: true })} />
             </div>
          )}

          <div className="space-y-2">
             <Label>Avg Growth (Last 30 Days)</Label>
             <Input type="number" placeholder="e.g. 500" {...register("avg_growth_last_30_days", { valueAsNumber: true })} />
          </div>

          <div className="space-y-2">
             <Label>Screenshot of Growth (Required if growth provided)</Label>
             <Input type="file" accept="image/*" onChange={(e) => setGrowthFile(e.target.files?.[0] || null)} />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Streaming Habits */}
      <Card>
        <CardHeader>
          <CardTitle>3. Streaming Habits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="space-y-2">
              <Label>Streams per Week *</Label>
              <Input type="number" {...register("streams_per_week", { valueAsNumber: true })} />
              <Warning show={streamsPerWeek > 0 && streamsPerWeek < 4} message="Recommended: 4-5 streams/week" />
           </div>

           <div className="space-y-2">
              <Label>Avg Stream Duration (Hours) *</Label>
              <Input type="number" step="0.1" {...register("avg_stream_duration", { valueAsNumber: true })} />
              <Warning show={avgStreamDuration > 0 && avgStreamDuration < 1.5} message="Recommended: 1.5+ hours" />
           </div>

           <div className="space-y-2 md:col-span-2">
              <Label className="mb-2 block">Typical Streaming Days *</Label>
              <div className="flex flex-wrap gap-4">
                 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                     <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                           id={`day-${day}`}
                           checked={typicalStreamingDays.includes(day)}
                           onCheckedChange={(checked) => {
                               if (checked) form.setValue("typical_streaming_days", [...typicalStreamingDays, day]);
                               else form.setValue("typical_streaming_days", typicalStreamingDays.filter(d => d !== day));
                           }}
                        />
                        <Label htmlFor={`day-${day}`}>{day}</Label>
                     </div>
                 ))}
              </div>
              <Warning show={typicalStreamingDays.length > 0 && typicalStreamingDays.length < 4} message="Recommended: 4+ days" />
           </div>

           <div className="flex items-center space-x-2 md:col-span-2">
             <Controller
                control={control}
                name="fixed_schedule"
                render={({ field }) => (
                    <Checkbox id="schedule" checked={field.value} onCheckedChange={field.onChange} />
                )}
            />
             <Label htmlFor="schedule">Do you have a fixed schedule?</Label>
           </div>
        </CardContent>
      </Card>

      {/* Section 4: Live Audience Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>4. Live Audience Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="space-y-2">
              <Label>Avg Concurrent Viewers *</Label>
              <Input type="number" {...register("avg_concurrent_viewers", { valueAsNumber: true })} />
              <Warning show={avgConcurrentViewers > 0 && avgConcurrentViewers < 20} message="Recommended: 20+ viewers" />
           </div>

           <div className="space-y-2">
              <Label>Avg Total Live Views *</Label>
              <Input type="number" {...register("avg_total_live_views", { valueAsNumber: true })} />
              <Warning show={avgTotalLiveViews > 0 && avgTotalLiveViews < 300} message="Recommended: 300+ views" />
           </div>

           <div className="space-y-2">
              <Label>Chat Activity Rating (Self-rated 1-10)</Label>
              <Input type="number" min="1" max="10" {...register("chat_activity_rating", { valueAsNumber: true })} />
           </div>

           <div className="space-y-2">
             <Label>Screenshot of Recent Live Analytics (Optional)</Label>
             <Input type="file" accept="image/*" onChange={(e) => setAnalyticsFile(e.target.files?.[0] || null)} />
          </div>
        </CardContent>
      </Card>

       {/* Section 5: Content Output */}
       <Card>
        <CardHeader>
          <CardTitle>5. Content Output</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="space-y-2">
              <Label>Reels/Shorts Posted (Last 30 Days) *</Label>
              <Input type="number" {...register("reels_posted_last_30_days", { valueAsNumber: true })} />
              <Warning show={reelsPosted > 0 && reelsPosted < 8} message="Recommended: 8+ reels" />
           </div>

           <div className="space-y-2">
              <Label>Avg Views (Last 5 Reels) *</Label>
              <Input type="number" {...register("avg_views_last_5_reels", { valueAsNumber: true })} />
              <Warning show={avgReelViews > 0 && avgReelViews < 3000} message="Recommended: 3,000+ views" />
           </div>

           <div className="space-y-2 md:col-span-2">
              <Label>YouTube Long Videos (Last 30 Days)</Label>
              <Input type="number" {...register("youtube_long_videos_last_30_days", { valueAsNumber: true })} />
           </div>

           <div className="flex items-center space-x-2 md:col-span-2">
             <Controller
                control={control}
                name="comfortable_clipping_streams"
                render={({ field }) => (
                    <Checkbox id="clipping" checked={field.value} onCheckedChange={field.onChange} />
                )}
            />
             <Label htmlFor="clipping">Comfortable clipping streams into reels? *</Label>
             {errors.comfortable_clipping_streams && <span className="text-red-500 text-xs">Required</span>}
           </div>

           <div className="flex items-center space-x-2 md:col-span-2">
             <Controller
                control={control}
                name="comfortable_posting_reels_weekly"
                render={({ field }) => (
                    <Checkbox id="posting" checked={field.value} onCheckedChange={field.onChange} />
                )}
            />
             <Label htmlFor="posting">Comfortable posting reels weekly? *</Label>
             {errors.comfortable_posting_reels_weekly && <span className="text-red-500 text-xs">Required</span>}
           </div>
        </CardContent>
      </Card>

      {/* Section 6: Consistency & Discipline */}
      <Card>
        <CardHeader>
          <CardTitle>6. Consistency & Discipline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="space-y-2">
              <Label>Longest Inactivity Gap (Days, Last 30d)</Label>
              <Input type="number" {...register("longest_inactivity_gap_days", { valueAsNumber: true })} />
              <Warning show={inactivityGap > 4} message="Recommended: ≤ 4 days" />
           </div>

           <div className="space-y-2">
              <Label>Missed Planned Streams (Last 30d)</Label>
              <Input type="number" {...register("missed_planned_streams", { valueAsNumber: true })} />
              <Warning show={missedStreams > 1} message="Recommended: ≤ 1 stream" />
           </div>

           <div className="flex items-center space-x-2 md:col-span-2">
             <Controller
                control={control}
                name="uses_content_calendar"
                render={({ field }) => (
                    <Checkbox id="calendar" checked={field.value} onCheckedChange={field.onChange} />
                )}
            />
             <Label htmlFor="calendar">Do you use a content calendar?</Label>
           </div>
        </CardContent>
      </Card>

      {/* Section 7: Professional Readiness */}
      <Card>
        <CardHeader>
          <CardTitle>7. Professional Readiness</CardTitle>
          <CardDescription>All fields are mandatory.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {[
                { id: 'branding', label: 'Willing to use org branding?', key: 'willing_to_use_org_branding' },
                { id: 'tagging', label: 'Willing to tag org in reels?', key: 'willing_to_tag_org' },
                { id: 'collabs', label: 'Willing to do collab posts?', key: 'willing_to_do_collabs' },
                { id: 'insights', label: 'Willing to share monthly insights privately?', key: 'willing_to_share_insights' },
                { id: 'agreement', label: 'Willing to sign a 3-month trial agreement?', key: 'willing_to_sign_agreement' },
            ].map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                     <Controller
                        control={control}
                        name={item.key as any}
                        render={({ field }) => (
                            <Checkbox id={item.id} checked={field.value} onCheckedChange={field.onChange} />
                        )}
                    />
                    <Label htmlFor={item.id}>{item.label}</Label>
                    {errors[item.key as keyof FormValues] && <span className="text-red-500 text-xs">Required</span>}
                </div>
            ))}
        </CardContent>
      </Card>

      {/* Section 8: Community */}
      <Card>
        <CardHeader>
          <CardTitle>8. Community & Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="discord_knowledge"
                    render={({ field }) => (
                        <Checkbox id="discord" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="discord">Discord knowledge / experience?</Label>
             </div>
             <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="actively_engages_discord"
                    render={({ field }) => (
                        <Checkbox id="engages" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="engages">Actively engages Discord audience?</Label>
             </div>
              <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="hosted_community_games"
                    render={({ field }) => (
                        <Checkbox id="hosted" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="hosted">Hosted community games/custom rooms before?</Label>
             </div>
             <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="collaborated_before"
                    render={({ field }) => (
                        <Checkbox id="collab_before" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="collab_before">Collaborated with orgs/creators before?</Label>
             </div>
        </CardContent>
      </Card>

       {/* Section 9: Behaviour & Safety */}
       <Card>
        <CardHeader>
          <CardTitle>9. Behaviour & Safety</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="no_cheating_hacks"
                    render={({ field }) => (
                        <Checkbox id="hacks" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="hacks">I confirm I do not use any cheats or hacks.</Label>
                {errors.no_cheating_hacks && <span className="text-red-500 text-xs">Required</span>}
             </div>
             <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="no_betting_gambling"
                    render={({ field }) => (
                        <Checkbox id="gambling" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="gambling">I confirm I do not promote betting/gambling.</Label>
                 {errors.no_betting_gambling && <span className="text-red-500 text-xs">Required</span>}
             </div>
              <div className="flex items-center space-x-2">
                <Controller
                    control={control}
                    name="comfortable_content_guidelines"
                    render={({ field }) => (
                        <Checkbox id="guidelines" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <Label htmlFor="guidelines">I am comfortable with content guidelines.</Label>
                 {errors.comfortable_content_guidelines && <span className="text-red-500 text-xs">Required</span>}
             </div>
        </CardContent>
      </Card>

      {/* Section 10: Open Responses */}
      <Card>
        <CardHeader>
          <CardTitle>10. Final Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label>Why do you want to join? *</Label>
            <Textarea {...register("why_join")} placeholder="Tell us about your motivation..." />
            {errors.why_join && <p className="text-red-500 text-sm">{errors.why_join.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Support needed? *</Label>
            <Textarea {...register("support_needed")} placeholder="What kind of support do you expect from us?" />
            {errors.support_needed && <p className="text-red-500 text-sm">{errors.support_needed.message}</p>}
          </div>

           <div className="space-y-2">
            <Label>Social Links</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input {...register("social_links_youtube")} placeholder="YouTube Channel Link" />
                <Input {...register("social_links_instagram")} placeholder="Instagram Profile Link" />
                <Input {...register("social_links_discord")} placeholder="Discord Profile/Server Link" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anything else we should know?</Label>
            <Textarea {...register("additional_info")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application"}
      </Button>
    </form>
  );
}
