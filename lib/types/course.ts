export interface CourseImage {
  id: number;
  url: string;
}

export interface Course {
  id: number;
  slug: string;

  title: string;
  shortDescription: string;
  description: string;

  institute: string;
  category: string;

  duration: string;
  level: string;

  rating: number;
  reviews: number;

  price: string;

  verified: boolean;

  students: string;

  images: CourseImage[];

  tags: string[];
}