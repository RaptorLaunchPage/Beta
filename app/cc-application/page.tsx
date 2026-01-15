import CCApplicationForm from "@/components/cc-application/CCApplicationForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CC Application | Raptor Esports",
  description: "Apply to become a content creator for Raptor Esports.",
};

export default function CCApplicationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CCApplicationForm />
    </div>
  );
}
