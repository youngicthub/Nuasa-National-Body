import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Hero } from "@/components/home/Hero";
import { ConventionBanner } from "@/components/home/ConventionBanner";
import { PresidentSection } from "@/components/home/PresidentSection";
import { ProfessionalExams } from "@/components/home/ProfessionalExams";
import { FeaturedResources } from "@/components/home/FeaturedResources";
import { LatestPosts } from "@/components/home/LatestPosts";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <SEO
        title="NUASA National Body — E-Library & Blog"
        description="Access thousands of accounting resources, research papers, study guides, and articles. The official NUASA National Body E-Library and Blog for Nigerian students."
        path="/"
      />
      <Hero />
      <ConventionBanner />
      <PresidentSection />
      <ProfessionalExams />
      <FeaturedResources />
      <LatestPosts />
      <CTASection />
    </Layout>
  );
};

export default Index;

