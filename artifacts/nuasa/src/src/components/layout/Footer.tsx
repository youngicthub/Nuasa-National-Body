import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Award } from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import logoIcan from "@assets/logo-ican_1782102290799.JPG";
import logoAnan from "@assets/logo-anan_1782102290801.png";
import logoCima from "@/assets/logo-cima.png";
import logoFinprep from "@/assets/logo-finprep.jpeg";

const professionalBodies = [
  {
    name: "ICAN",
    full: "Institute of Chartered Accountants of Nigeria",
    logo: logoIcan,
    href: "https://icanig.org",
  },
  {
    name: "ANAN",
    full: "Association of National Accountants of Nigeria",
    logo: logoAnan,
    href: "https://anan.org.ng",
  },
  {
    name: "CIMA",
    full: "Chartered Institute of Management Accountants",
    logo: logoCima,
    href: "https://www.cimaglobal.com",
  },
  {
    name: "FinPrep Academy",
    full: "FinPrep Academy",
    logo: logoFinprep,
    href: "https://finprepacademy.com",
  },
];

const quickLinks = [
  { name: "Home", path: "/" },
  { name: "E-Library", path: "/library" },
  { name: "Blog", path: "/blog" },
  { name: "About Us", path: "/about" },
];

const resources = [
  { name: "Academic Resources", path: "/library?category=academic" },
  { name: "Research Papers", path: "/library?category=research" },
  { name: "Study Guides", path: "/library?category=guides" },
  { name: "Past Questions", path: "/library?category=past-questions" },
];

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="content-container section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={nuasaLogo}
                alt="NUASA National Body logo"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg leading-tight">
                  NUASA
                </span>
                <span className="text-xs opacity-80 leading-tight">
                  National Body E-Library
                </span>
              </div>
            </Link>
            <p className="text-sm opacity-80 leading-relaxed">
              Empowering Nigerian students with access to quality educational resources, 
              research materials, and academic support.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm opacity-80 hover:opacity-100 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-serif font-semibold text-lg mb-4">Resources</h4>
            <ul className="space-y-2">
              {resources.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm opacity-80 hover:opacity-100 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 opacity-80" />
                <span className="text-sm opacity-80">
                  National Secretariat, Abuja, Nigeria
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-80">+234 704 884 8731</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 opacity-80 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm opacity-80">nuasanational@gmail.com</span>
                  <span className="text-sm opacity-80">info@nuasanational.com.ng</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Professional Bodies & Sponsors */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          {/* Professional Bodies */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-accent" />
              <h4 className="font-serif font-semibold text-base">Partners & Professional Bodies</h4>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {professionalBodies.map((body) => (
                <a
                  key={body.name}
                  href={body.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={body.full}
                  aria-label={`Visit ${body.full} website`}
                  className="flex items-center justify-center h-16 w-24 rounded-md bg-primary-foreground p-2 border border-primary-foreground/20 hover:scale-105 hover:shadow-lg transition-all"
                >
                  <img
                    src={body.logo}
                    alt={`${body.name} logo`}
                    loading="lazy"
                    width={96}
                    height={64}
                    className="max-h-full max-w-full object-contain"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p className="text-sm opacity-60">
              © {new Date().getFullYear()} NUASA National. All rights reserved.
            </p>
            <span className="hidden md:inline opacity-40">•</span>
            <p className="text-sm opacity-60">
              Developed by{" "}
              <a
                href="https://dangoodnews.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent hover:opacity-80 transition-opacity"
              >
                YoungICT-Hub
              </a>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
