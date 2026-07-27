import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Users, FileText, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { icon: BookOpen, value: "10,000+", label: "Resources" },
  { icon: Users, value: "50,000+", label: "Students" },
  { icon: FileText, value: "500+", label: "Articles" },
  { icon: Award, value: "100+", label: "Institutions" },
];

export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center hero-gradient overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/50 rounded-full blur-3xl" />
      </div>
      {/* Top & bottom gold rules */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="content-container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-primary-foreground"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs tracking-[0.2em] uppercase font-medium mb-6 backdrop-blur-sm">
              <Award className="w-3.5 h-3.5" />
              NUASA National Body E-Library
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-balance">
              Unlock Your{" "}
              <span className="text-gradient italic">Academic Potential</span>
            </h1>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-accent/60" />
              <span className="text-accent text-xs tracking-[0.3em] uppercase">NUASA National</span>
            </div>

            <p className="text-lg md:text-xl opacity-90 mb-8 leading-relaxed max-w-xl">
              Access thousands of academic resources, research papers, and study materials. 
              Your gateway to educational excellence starts here.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 pulse-glow"
              >
                <Link to="/library">
                  Explore Library
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-black/40 text-primary-foreground hover:bg-transparent"
              >
                <Link to="/register">Join NUASA</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="glass-card rounded-xl p-4 text-center"
                >
                  <stat.icon className="w-5 h-5 text-accent mx-auto mb-2" />
                  <div className="font-bold text-xl">{stat.value}</div>
                  <div className="text-xs opacity-70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Hero Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-transparent rounded-3xl blur-2xl" />
              <div className="relative glass-card rounded-3xl p-8 float">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-primary-foreground/10 rounded-xl p-6 backdrop-blur"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent/20 mb-3" />
                      <div className="h-2 w-3/4 bg-primary-foreground/20 rounded mb-2" />
                      <div className="h-2 w-1/2 bg-primary-foreground/10 rounded" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm opacity-70">
                  <BookOpen className="w-4 h-4" />
                  <span>Digital Resources at Your Fingertips</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
