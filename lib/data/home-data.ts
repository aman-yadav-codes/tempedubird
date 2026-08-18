import {
  BookOpen,
  Award,
  Users,
  TrendingUp,
  GraduationCap,
  Briefcase,
  Zap,
  Shield,
} from "lucide-react";

export const featuredCourses = [
  {
    id: 1,
    slug: "full-stack-web-development",

    title: "Full Stack Web Development",
    shortDescription: "Learn frontend and backend web development.",
    description:
      "Master HTML, CSS, JavaScript, React, Node.js, MongoDB, APIs, and deployment with hands-on projects.",

    institute: "Technorigator Institute",
    category: "Development",

    duration: "6 Months",
    level: "Beginner to Advanced",

    rating: 4.8,
    reviews: 234,

    price: "₹45,000",

    verified: true,

    students: "1.2k enrolled",

    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
      },
    ],

    tags: ["React", "Node.js", "MongoDB", "JavaScript"],
  },

  {
    id: 2,
    slug: "data-science-analytics",

    title: "Data Science & Analytics",
    shortDescription: "Data analysis, ML, and visualization course.",
    description:
      "Learn Python, machine learning, pandas, NumPy, Power BI, and data visualization from industry experts.",

    institute: "Tech Academy Pro",
    category: "Data Science",

    duration: "8 Months",
    level: "Intermediate",

    rating: 4.9,
    reviews: 189,

    price: "₹55,000",

    verified: true,

    students: "890 enrolled",

    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4",
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
      },
    ],

    tags: ["Python", "Machine Learning", "Analytics", "Power BI"],
  },

  {
    id: 3,
    slug: "digital-marketing-masterclass",

    title: "Digital Marketing Masterclass",
    shortDescription: "Complete digital marketing training program.",
    description:
      "Learn SEO, Google Ads, Meta Ads, content marketing, and social media growth strategies.",

    institute: "Marketing Hub",
    category: "Marketing",

    duration: "4 Months",
    level: "All Levels",

    rating: 4.7,
    reviews: 312,

    price: "₹30,000",

    verified: true,

    students: "2.1k enrolled",

    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07",
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931",
      },
    ],

    tags: ["SEO", "Google Ads", "Meta Ads", "Marketing"],
  },

  {
    id: 4,
    slug: "ui-ux-design-fundamentals",

    title: "UI/UX Design Fundamentals",
    shortDescription: "Design modern apps and websites.",
    description:
      "Learn Figma, wireframing, prototyping, design systems, and user experience best practices.",

    institute: "Design School Plus",
    category: "Design",

    duration: "5 Months",
    level: "Beginner",

    rating: 4.9,
    reviews: 156,

    price: "₹40,000",

    verified: true,

    students: "750 enrolled",

    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6",
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d",
      },
    ],

    tags: ["Figma", "UI Design", "UX", "Prototyping"],
  },

  {
    id: 5,
    slug: "cloud-computing-devops",

    title: "Cloud Computing & DevOps",
    shortDescription: "Master cloud infrastructure and automation.",
    description:
      "Learn AWS, Docker, Kubernetes, CI/CD pipelines, Linux, and DevOps deployment workflows.",

    institute: "Cloud Masters",
    category: "Cloud & DevOps",

    duration: "6 Months",
    level: "Advanced",

    rating: 4.8,
    reviews: 143,

    price: "₹60,000",

    verified: true,

    students: "620 enrolled",

    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28",
      },
    ],

    tags: ["AWS", "Docker", "Kubernetes", "DevOps"],
  },

  {
    id: 6,
    slug: "business-management-leadership",

    title: "Business Management & Leadership",
    shortDescription: "Build leadership and business skills.",
    description:
      "Learn management principles, leadership strategies, team building, and business operations.",

    institute: "Business Institute",
    category: "Management",

    duration: "12 Months",
    level: "Intermediate",

    rating: 4.7,
    reviews: 278,

    price: "₹75,000",

    verified: true,

    students: "1.5k enrolled",

    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1552664730-d307ca884978",
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1515169067868-5387ec356754",
      },
    ],

    tags: ["Leadership", "Management", "Business", "Communication"],
  },
];

export const categories = [
  { name: "Development", count: 234, icon: BookOpen, slug: "development" },
  { name: "Design", count: 156, icon: Zap, slug: "design" },
  { name: "Business", count: 189, icon: Briefcase, slug: "business" },
  { name: "Marketing", count: 143, icon: TrendingUp, slug: "marketing" },
  { name: "Data Science", count: 167, icon: Award, slug: "data-science" },
  { name: "Cloud & DevOps", count: 98, icon: Shield, slug: "cloud-devops" },
  { name: "Management", count: 74, icon: GraduationCap, slug: "management" },
];

export const stats = [
  { label: "Active Courses", value: "1,200+", icon: BookOpen },
  { label: "Students Enrolled", value: "50,000+", icon: Users },
  { label: "Partner Institutes", value: "150+", icon: GraduationCap },
  { label: "Success Rate", value: "94%", icon: TrendingUp },
];

export const whyChooseUs = [
  {
    icon: Shield,
    title: "Verified Institutes",
    description:
      "Every institute is thoroughly verified with official documentation and student reviews.",
  },
  {
    icon: Award,
    title: "Transparent Information",
    description:
      "Access verified data, management claims, and real student feedback in one place.",
  },
  {
    icon: GraduationCap,
    title: "Best Price Guarantee",
    description:
      "Compare prices and get the best deals on courses from top educational institutes.",
  },
];