import { motion } from "framer-motion";
import { GraduationCap, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import logoIcan from "@assets/logo-ican_1782102290799.JPG";
import logoAnan from "@assets/logo-anan_1782102290801.png";

const platforms = [
  {
    name: "ICAN",
    full: "Institute of Chartered Accountants of Nigeria",
    description:
      "Register for ICAN professional examinations and become a chartered accountant.",
    logo: logoIcan,
    href: "https://icanig.org",
  },
  {
    name: "ANAN",
    full: "Association of National Accountants of Nigeria",
    description:
      "Register on the ANAN platform to pursue your CNA professional qualification.",
    logo: logoAnan,
    href: "https://anan.org.ng",
  },
];

export const ProfessionalExams = () => {
  return (
    <section className="section-padding bg-secondary/30">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="mb-4 gap-1">
            <GraduationCap className="w-3 h-3" />
            Professional Exams
          </Badge>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Check out our Professional Exams
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Take the next step in your accounting career. Register on the ANAN and ICAN
            platforms to write your professional examinations.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {platforms.map((platform, index) => (
            <motion.a
              key={platform.name}
              href={platform.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-card rounded-2xl border border-border p-6 card-hover flex items-center gap-5"
            >
              <div className="flex items-center justify-center h-20 w-20 shrink-0 rounded-xl bg-primary-foreground border border-border p-2">
                <img
                  src={platform.logo}
                  alt={`${platform.name} logo`}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-accent transition-colors">
                    {platform.name}
                  </h3>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {platform.full}
                </p>
                <p className="text-sm text-foreground/80 line-clamp-2">
                  {platform.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Click a platform above to visit the official registration site.
          </p>
        </div>
      </div>
    </section>
  );
};
