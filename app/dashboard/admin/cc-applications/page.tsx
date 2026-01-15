"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, ExternalLink, Check, X, Search, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Application = {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  primary_platform: string;
  status: string;
  is_eligible: boolean;
  instagram_follower_count: number | null;
  youtube_subscriber_count: number | null;
  avg_growth_last_30_days: number | null;
  streams_per_week: number | null;
  avg_stream_duration: number | null;
  avg_concurrent_viewers: number | null;
  avg_total_live_views: number | null;
  reels_posted_last_30_days: number | null;
  avg_views_last_5_reels: number | null;
  why_join: string;
  support_needed: string;
  social_links: any;
  avg_growth_screenshot_url: string | null;
  recent_live_analytics_screenshot_url: string | null;
  [key: string]: any;
};

export default function CCApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEligibility, setFilterEligibility] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cc_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications");
      console.error(error);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("cc_applications")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Application marked as ${newStatus}`);
      fetchApplications();
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    const matchesEligibility =
      filterEligibility === "all"
        ? true
        : filterEligibility === "eligible"
        ? app.is_eligible
        : !app.is_eligible;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.email && app.email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesEligibility && matchesSearch;
  });

  // Analytics Data Preparation
  const totalApps = applications.length;
  const eligibleApps = applications.filter(a => a.is_eligible).length;
  const eligiblePercent = totalApps > 0 ? ((eligibleApps / totalApps) * 100).toFixed(1) : "0";
  const platformCounts = applications.reduce((acc: any, app) => {
      acc[app.primary_platform] = (acc[app.primary_platform] || 0) + 1;
      return acc;
  }, {});
  const platformData = Object.entries(platformCounts).map(([name, value]) => ({ name, value }));

  const DetailsSheet = ({ app }: { app: Application | null }) => {
      if (!app) return null;

      return (
        <Sheet open={!!app} onOpenChange={(open) => !open && setSelectedApp(null)}>
            <SheetContent className="w-[800px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{app.name}</SheetTitle>
                    <SheetDescription>
                        Status: <Badge variant="outline">{app.status}</Badge> | Eligible: <Badge variant={app.is_eligible ? "default" : "destructive"}>{app.is_eligible ? "Yes" : "No"}</Badge>
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    {/* Images */}
                    <div className="grid grid-cols-2 gap-4">
                        {app.avg_growth_screenshot_url && (
                             <div>
                                 <p className="text-sm font-medium mb-1">Growth Proof</p>
                                 <a href={app.avg_growth_screenshot_url} target="_blank" rel="noopener noreferrer">
                                     <img src={app.avg_growth_screenshot_url} alt="Growth" className="rounded-md border object-cover h-32 w-full" />
                                 </a>
                             </div>
                        )}
                         {app.recent_live_analytics_screenshot_url && (
                             <div>
                                 <p className="text-sm font-medium mb-1">Analytics Proof</p>
                                 <a href={app.recent_live_analytics_screenshot_url} target="_blank" rel="noopener noreferrer">
                                     <img src={app.recent_live_analytics_screenshot_url} alt="Analytics" className="rounded-md border object-cover h-32 w-full" />
                                 </a>
                             </div>
                        )}
                    </div>

                    {/* Data Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="font-semibold col-span-2 border-b pb-1 mt-2">Platform Metrics</div>
                        <div>Followers/Subs:</div><div>{app.instagram_follower_count || app.youtube_subscriber_count || '-'}</div>
                        <div>Growth (30d):</div><div>{app.avg_growth_last_30_days || '-'}</div>

                        <div className="font-semibold col-span-2 border-b pb-1 mt-2">Streaming Habits</div>
                        <div>Streams/Week:</div><div>{app.streams_per_week}</div>
                        <div>Avg Duration:</div><div>{app.avg_stream_duration}h</div>
                        <div>Concurrent Viewers:</div><div>{app.avg_concurrent_viewers}</div>
                        <div>Total Live Views:</div><div>{app.avg_total_live_views}</div>

                        <div className="font-semibold col-span-2 border-b pb-1 mt-2">Content Output</div>
                        <div>Reels (30d):</div><div>{app.reels_posted_last_30_days}</div>
                        <div>Avg Reel Views:</div><div>{app.avg_views_last_5_reels}</div>
                    </div>

                    {/* Open Responses */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Why Join?</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{app.why_join}</p>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Support Needed</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{app.support_needed}</p>
                    </div>

                     {/* Social Links */}
                     {app.social_links && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Links</h4>
                             <div className="flex flex-col gap-1 text-sm text-blue-500">
                                {Object.entries(typeof app.social_links === 'string' ? JSON.parse(app.social_links) : app.social_links).map(([k, v]: any) => (
                                    <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                        <ExternalLink className="w-3 h-3" /> {k}: {v}
                                    </a>
                                ))}
                             </div>
                        </div>
                     )}

                     {/* Actions */}
                     <div className="flex justify-end gap-2 pt-4 border-t">
                         <Button variant="outline" onClick={() => updateStatus(app.id, 'rejected')}>Reject</Button>
                         <Button variant="default" onClick={() => updateStatus(app.id, 'approved')}>Approve</Button>
                     </div>
                </div>
            </SheetContent>
        </Sheet>
      );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">CC Applications</h1>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApps}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligibility Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eligiblePercent}%</div>
          </CardContent>
        </Card>
         <Card className="col-span-2">
           <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Platform Distribution</CardTitle>
           </CardHeader>
           <CardContent className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={platformData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" barSize={20} radius={[0, 4, 4, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEligibility} onValueChange={setFilterEligibility}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Eligibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Eligibility</SelectItem>
            <SelectItem value="eligible">Eligible Only</SelectItem>
            <SelectItem value="ineligible">Ineligible Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Metrics (Followers/Subs)</TableHead>
              <TableHead>Eligible</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredApps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              filteredApps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>{app.primary_platform}</TableCell>
                  <TableCell>
                    {app.instagram_follower_count
                      ? `${app.instagram_follower_count} (IG)`
                      : app.youtube_subscriber_count
                      ? `${app.youtube_subscriber_count} (YT)`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {app.is_eligible ? (
                      <Badge variant="default" className="bg-green-600">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'outline'}>
                        {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedApp(app)}>
                        <FileText className="w-4 h-4 mr-2" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DetailsSheet app={selectedApp} />
    </div>
  );
}
