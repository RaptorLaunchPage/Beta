"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

// --- Validation Schema ---
const formSchema = z.object({
  // Section 1: Identity & Platform
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  primary_platform: z.enum(["YouTube", "Instagram"]),
  secondary_platform: z.enum(["YouTube", "Instagram", "None"]).optional(),
  primarily_streams_bgmi: z.boolean(),

  // Section 2: Platform Metrics
  instagram_follower_count: z.number().optional(),
  youtube_subscriber_count: z.number().optional(),
  avg_growth_last_30_days: z.union([z.number(), z.nan()]).optional(),

  // Section 3: Streaming Habits
  streams_per_week: z.number().min(0),
  avg_stream_duration: z.number().min(0),
  typical_streaming_days: z.array(z.string()).min(1, "Select at least one day"),
  fixed_schedule: z.boolean(),

  // Section 4: Live Audience Metrics
  avg_concurrent_viewers: z.number().min(0),
  avg_total_live_views: z.number().min(0),
  chat_activity_rating: z.number().min(1).max(10).optional(),

  // Section 5: Content Output
  reels_posted_last_30_days: z.number().min(0),
  avg_views_last_5_reels: z.number().min(0),
  youtube_long_videos_last_30_days: z.number().optional(),
  comfortable_clipping_streams: z.boolean().refine(val => val === true, "Required"),
  comfortable_posting_reels_weekly: z.boolean().refine(val => val === true, "Required"),

  // Section 6: Consistency & Discipline
  longest_inactivity_gap_days: z.number().min(0),
  missed_planned_streams: z.number().min(0),
  uses_content_calendar: z.boolean().optional(),

  // Section 7: Professional Readiness
  willing_to_use_org_branding: z.boolean().refine(val => val === true, "Required"),
  willing_to_tag_org: z.boolean().refine(val => val === true, "Required"),
  willing_to_do_collabs: z.boolean().refine(val => val === true, "Required"),
  willing_to_share_insights: z.boolean().refine(val => val === true, "Required"),
  willing_to_sign_agreement: z.boolean().refine(val => val === true, "Required"),

  // Section 8: Community & Experience
  discord_knowledge: z.boolean().optional(),
  actively_engages_discord: z.boolean().optional(),
  hosted_community_games: z.boolean().optional(),
  collaborated_before: z.boolean().optional(),

  // Section 9: Behaviour & Safety
  no_cheating_hacks: z.boolean().refine(val => val === true, "Must confirm"),
  no_betting_gambling: z.boolean().refine(val => val === true, "Must confirm"),
  comfortable_content_guidelines: z.boolean().refine(val => val === true, "Must confirm"),

  // Section 10: Final Questions
  why_join: z.string().min(10, "Please elaborate"),
  support_needed: z.string().min(5, "Please specify"),
  social_links_youtube: z.string().url().optional().or(z.literal("")),
  social_links_instagram: z.string().url().optional().or(z.literal("")),
  social_links_discord: z.string().optional(),
  additional_info: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Field groups for steps
const steps = [
  { id: 'identity', title: 'Identity & Platform', fields: ['name', 'email', 'primary_platform', 'secondary_platform', 'primarily_streams_bgmi'] },
  { id: 'metrics', title: 'Platform Metrics', fields: ['instagram_follower_count', 'youtube_subscriber_count', 'avg_growth_last_30_days'] },
  { id: 'habits', title: 'Streaming Habits', fields: ['streams_per_week', 'avg_stream_duration', 'typical_streaming_days', 'fixed_schedule'] },
  { id: 'audience', title: 'Live Audience', fields: ['avg_concurrent_viewers', 'avg_total_live_views', 'chat_activity_rating'] },
  { id: 'content', title: 'Content Output', fields: ['reels_posted_last_30_days', 'avg_views_last_5_reels', 'youtube_long_videos_last_30_days', 'comfortable_clipping_streams', 'comfortable_posting_reels_weekly'] },
  { id: 'consistency', title: 'Consistency', fields: ['longest_inactivity_gap_days', 'missed_planned_streams', 'uses_content_calendar'] },
  { id: 'readiness', title: 'Professional Readiness', fields: ['willing_to_use_org_branding', 'willing_to_tag_org', 'willing_to_do_collabs', 'willing_to_share_insights', 'willing_to_sign_agreement'] },
  { id: 'community', title: 'Community', fields: ['discord_knowledge', 'actively_engages_discord', 'hosted_community_games', 'collaborated_before'] },
  { id: 'safety', title: 'Behaviour & Safety', fields: ['no_cheating_hacks', 'no_betting_gambling', 'comfortable_content_guidelines'] },
  { id: 'final', title: 'Final Questions', fields: ['why_join', 'support_needed', 'social_links_youtube', 'social_links_instagram', 'social_links_discord', 'additional_info'] },
  { id: 'review', title: 'Review & Submit', fields: [] }
];

export default function CCApplicationForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
    mode: "onChange"
  });

  const { watch, control, register, formState: { errors }, trigger, getValues, setValue } = form;
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
  const avgGrowth = watch("avg_growth_last_30_days");

  const nextStep = async () => {
    const fields = steps[currentStep].fields;

    // Custom check for Step 1 (Metrics): Screenshot required if growth > 0
    if (currentStep === 1) { // Step index 1 is 'metrics' in the steps array
       const growth = getValues("avg_growth_last_30_days");
       if (growth && growth > 0 && !growthFile) {
           toast.error("Please upload a screenshot proof for your growth metrics.");
           return;
       }
    }

    const isValid = await trigger(fields as any);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('social_links_')) return;
        if (value === undefined || value === null) return;

        if (key === 'typical_streaming_days') {
           formData.append(key, JSON.stringify(value));
        } else {
           formData.append(key, value.toString());
        }
      });

      const socialLinks: any = {};
      if (data.social_links_youtube) socialLinks.youtube = data.social_links_youtube;
      if (data.social_links_instagram) socialLinks.instagram = data.social_links_instagram;
      if (data.social_links_discord) socialLinks.discord = data.social_links_discord;
      formData.append('social_links', JSON.stringify(socialLinks));

      if (growthFile) formData.append('avg_growth_screenshot', growthFile);
      if (analyticsFile) formData.append('recent_live_analytics_screenshot', analyticsFile);

      const res = await fetch('/api/cc-application/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Submission failed");

      toast.success("Application submitted successfully!");
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Warning = ({ show, message }: { show: boolean, message: string }) => {
    if (!show) return null;
    return (
      <div className="text-amber-500 text-sm flex items-center gap-1 mt-1">
        <AlertTriangle className="w-3 h-3" />
        {message}
      </div>
    );
  };

  // Custom Boolean Field Component (Yes/No Buttons)
  const BooleanField = ({ name, label, control, required = false }: { name: any, label: string, control: any, required?: boolean }) => (
    <div className="space-y-2">
      <Label className={cn(errors[name] && "text-red-500")}>{label} {required && "*"}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex gap-4">
            <Button
              type="button"
              variant={field.value === true ? "default" : "outline"}
              className={cn("w-24", field.value === true && "bg-green-600 hover:bg-green-700")}
              onClick={() => field.onChange(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={field.value === false ? "default" : "outline"}
              className={cn("w-24", field.value === false && "bg-red-600 hover:bg-red-700")}
              onClick={() => field.onChange(false)}
            >
              No
            </Button>
          </div>
        )}
      />
      {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message as string}</p>}
    </div>
  );

  if (isSuccess) {
    return (
      <Card className="max-w-2xl mx-auto py-8">
        <CardContent className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-green-500/20 p-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Application Submitted!</h2>
          <p className="text-muted-foreground max-w-md">
            Thank you for applying to be a Content Creator at Raptor Esports. We will review your application and get back to you soon.
          </p>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => router.push('/')}>Return Home</Button>
            <Button onClick={() => window.open(process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.gg/raptoresports', '_blank')}>
              Join Discord
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto py-4">

      {/* Progress Bar */}
      <div className="w-full bg-secondary h-2 rounded-full mb-8">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>Step {currentStep + 1} of {steps.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 1: Identity */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Streamer Name / Alias *</Label>
                <Input {...register("name")} placeholder="Your IGN or Streamer Name" />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input {...register("email")} placeholder="contact@example.com" />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Primary Platform *</Label>
                <Controller
                  control={control}
                  name="primary_platform"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="YouTube">YouTube</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <BooleanField name="primarily_streams_bgmi" label="Do you primarily stream BGMI?" control={control} required />
            </div>
          )}

          {/* Step 2: Metrics */}
          {currentStep === 1 && (
            <div className="space-y-4">
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
                <Input type="number" {...register("avg_growth_last_30_days", { valueAsNumber: true })} />
              </div>
              {/* Show file upload if growth is > 0 */}
              {(avgGrowth && avgGrowth > 0) ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Screenshot of Growth *</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setGrowthFile(e.target.files?.[0] || null)} />
                  <p className="text-xs text-muted-foreground">Required because you entered a growth value.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Step 3: Habits */}
          {currentStep === 2 && (
            <div className="space-y-4">
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
              <div className="space-y-2">
                <Label className="mb-2 block">Typical Streaming Days *</Label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-accent cursor-pointer" onClick={() => {
                        const current = getValues("typical_streaming_days") || [];
                        if (current.includes(day)) setValue("typical_streaming_days", current.filter(d => d !== day));
                        else setValue("typical_streaming_days", [...current, day]);
                    }}>
                      <Checkbox
                        id={`day-${day}`}
                        checked={(typicalStreamingDays || []).includes(day)}
                        onCheckedChange={(checked) => {
                          const current = getValues("typical_streaming_days") || [];
                          if (checked) setValue("typical_streaming_days", [...current, day]);
                          else setValue("typical_streaming_days", current.filter(d => d !== day));
                        }}
                      />
                      <Label htmlFor={`day-${day}`} className="cursor-pointer">{day}</Label>
                    </div>
                  ))}
                </div>
                <Warning show={(typicalStreamingDays || []).length > 0 && (typicalStreamingDays || []).length < 4} message="Recommended: 4+ days" />
              </div>
              <BooleanField name="fixed_schedule" label="Do you have a fixed schedule?" control={control} />
            </div>
          )}

          {/* Step 4: Audience */}
          {currentStep === 3 && (
            <div className="space-y-4">
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
                <Label>Chat Activity Rating (1-10)</Label>
                <Input type="number" min="1" max="10" {...register("chat_activity_rating", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Screenshot of Recent Live Analytics</Label>
                <Input type="file" accept="image/*" onChange={(e) => setAnalyticsFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          )}

          {/* Step 5: Content */}
          {currentStep === 4 && (
            <div className="space-y-4">
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
              <div className="space-y-2">
                <Label>YouTube Long Videos (Last 30 Days)</Label>
                <Input type="number" {...register("youtube_long_videos_last_30_days", { valueAsNumber: true })} />
              </div>
              <BooleanField name="comfortable_clipping_streams" label="Comfortable clipping streams into reels?" control={control} required />
              <BooleanField name="comfortable_posting_reels_weekly" label="Comfortable posting reels weekly?" control={control} required />
            </div>
          )}

          {/* Step 6: Consistency */}
          {currentStep === 5 && (
            <div className="space-y-4">
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
              <BooleanField name="uses_content_calendar" label="Do you use a content calendar?" control={control} />
            </div>
          )}

          {/* Step 7: Readiness */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <BooleanField name="willing_to_use_org_branding" label="Willing to use org branding?" control={control} required />
              <BooleanField name="willing_to_tag_org" label="Willing to tag org in reels?" control={control} required />
              <BooleanField name="willing_to_do_collabs" label="Willing to do collab posts?" control={control} required />
              <BooleanField name="willing_to_share_insights" label="Willing to share monthly insights privately?" control={control} required />
              <BooleanField name="willing_to_sign_agreement" label="Willing to sign a 3-month trial agreement?" control={control} required />
            </div>
          )}

          {/* Step 8: Community */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <BooleanField name="discord_knowledge" label="Discord knowledge / experience?" control={control} />
              <BooleanField name="actively_engages_discord" label="Actively engages Discord audience?" control={control} />
              <BooleanField name="hosted_community_games" label="Hosted community games/custom rooms before?" control={control} />
              <BooleanField name="collaborated_before" label="Collaborated with orgs/creators before?" control={control} />
            </div>
          )}

          {/* Step 9: Safety */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <BooleanField name="no_cheating_hacks" label="I confirm I do not use any cheats or hacks." control={control} required />
              <BooleanField name="no_betting_gambling" label="I confirm I do not promote betting/gambling." control={control} required />
              <BooleanField name="comfortable_content_guidelines" label="I am comfortable with content guidelines." control={control} required />
            </div>
          )}

          {/* Step 10: Final */}
          {currentStep === 9 && (
            <div className="space-y-4">
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
                <div className="space-y-2">
                  <Input {...register("social_links_youtube")} placeholder="YouTube Channel Link" />
                  <Input {...register("social_links_instagram")} placeholder="Instagram Profile Link" />
                  <Input {...register("social_links_discord")} placeholder="Discord Profile/Server Link" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Anything else we should know?</Label>
                <Textarea {...register("additional_info")} />
              </div>
            </div>
          )}

          {/* Step 11: Review */}
          {currentStep === 10 && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
                <p><strong>Name:</strong> {getValues("name")}</p>
                <p><strong>Email:</strong> {getValues("email")}</p>
                <p><strong>Platform:</strong> {getValues("primary_platform")}</p>
                <p><strong>Streams/Week:</strong> {getValues("streams_per_week")}</p>
                <p><strong>Avg Duration:</strong> {getValues("avg_stream_duration")}h</p>
                <p><strong>Why Join:</strong> {getValues("why_join")}</p>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Ready to submit!</span>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0 || isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application"}
          </Button>
        )}
      </div>
    </form>
  );
}
