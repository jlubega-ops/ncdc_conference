import { FileText, BookOpen, ClipboardCheck, Presentation, Shield } from "lucide-react";

export const resources = [
  {
    id: "paper-templates",
    title: "Paper Templates",
    description: "Official LaTeX and Word templates for conference paper submissions.",
    icon: FileText,
    href: "/resources#paper-templates",
  },
  {
    id: "author-guidelines",
    title: "Author Guidelines",
    description: "Formatting, citation, and submission requirements for authors.",
    icon: BookOpen,
    href: "/resources#author-guidelines",
  },
  {
    id: "reviewer-guidelines",
    title: "Reviewer Guidelines",
    description: "Peer review criteria and evaluation rubrics for reviewers.",
    icon: ClipboardCheck,
    href: "/resources#reviewer-guidelines",
  },
  {
    id: "presentation-templates",
    title: "Presentation Templates",
    description: "PowerPoint and Google Slides templates for conference presentations.",
    icon: Presentation,
    href: "/resources#presentation-templates",
  },
  {
    id: "conference-policies",
    title: "Conference Policies",
    description: "Ethics, plagiarism, data privacy, and publication policies.",
    icon: Shield,
    href: "/resources#conference-policies",
  },
];

export const announcements = [
  {
    id: "review-extended",
    title: "Review Period Extended",
    date: "2027-01-10",
    summary: "The review period for NCDC Research Conference 2027 has been extended by one week.",
  },
  {
    id: "new-conference",
    title: "New Conference Added",
    date: "2027-01-05",
    summary: "Education Innovation Summit 2027 is now open for paper submissions.",
  },
  {
    id: "registration-updated",
    title: "Registration Deadline Updated",
    date: "2026-12-20",
    summary: "Teacher Innovation Summit registration deadline moved to 15 June 2027.",
  },
];
