export type Blog = {
  id: string;
  title: string;
  paragraph: string;
  image: string;
  author: {
    name: string;
    image: string;
    designation: string;
  };
  tags: string[];
  publishDate: string;
  slug: string;
};